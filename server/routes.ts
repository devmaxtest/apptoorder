import type { Express, Request } from "express";
import { type Server } from "http";
import validator from "validator";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { registerHubRiseRoutes, pushOrderToHubRise } from "./replit_integrations/hubrise";
import { realtimeSync } from "./websocket";
import { authStorage } from "./replit_integrations/auth/storage";
import { createTwoFactorChallenge, verifyTwoFactorCode } from "./utils/adminTwoFactor";
import { getLandingContent, saveLandingContent, validateLandingContent } from "./landingContent";
import { getStripe, createSubscriptionCheckout, createOrderCheckoutSession, PLANS } from "./stripe";
import { sendNewOrderEmailToRestaurant, sendOrderConfirmationToCustomer, sendOrderStatusUpdateToCustomer, isEmailConfigured } from "./email";
import { pushNewOrderToRestaurant, pushOrderStatusToCustomer, isPushConfigured } from "./push";

import { 
  insertDishSchema, 
  insertCategorySchema, 
  createOrderRequestSchema, 
  insertRestaurantSchema,
  updateRestaurantSchema,
  insertRestaurantServiceSchema,
  type ValidatedOrderItem 
} from "@shared/schema";

// COBA Monitoring Integration
async function trackCobaEvent(eventType: string, data: Record<string, any>, tenantId?: string) {
  const cobaApiUrl = process.env.COBA_API_URL;
  const cobaApiKey = process.env.COBA_API_KEY;
  
  if (!cobaApiUrl || !cobaApiKey) return;

  try {
    await fetch(`${cobaApiUrl}/api/coba/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-coba-key': cobaApiKey,
      },
      body: JSON.stringify({
        eventType,
        tenantId: tenantId || 'platform',
        timestamp: Date.now(),
        data,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    console.warn(`[COBA] Failed to track ${eventType}:`, error);
  }
}

function stripSensitiveRestaurantFields(restaurant: any) {
  if (!restaurant) return restaurant;
  const { hubriseAccessToken, hubriseRefreshToken, hubriseCustomerListId, stripeSecretKey, ...safe } = restaurant;
  return safe;
}

function stripSensitiveRestaurantList(restaurants: any[]) {
  return restaurants.map(stripSensitiveRestaurantFields);
}

function sanitizeString(input: string): string {
  return validator.escape(validator.trim(input));
}

// Validate phone number format
function isValidPhone(phone: string): boolean {
  return validator.isMobilePhone(phone, "any") || /^[\d\s\-+()]{6,20}$/.test(phone);
}

// Get user ID from authenticated request
function getUserId(req: Request): string | undefined {
  return (req.user as any)?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication BEFORE other routes
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup object storage routes for file uploads
  registerObjectStorageRoutes(app);
  
  // Setup HubRise integration routes (optional - only if credentials are configured)
  try {
    registerHubRiseRoutes(app);
    console.log("HubRise routes registered");
  } catch (error) {
    console.log("HubRise not configured - routes not registered");
  }

  // ============ LIGHTWEIGHT PING ============

  app.get("/api/ping", async (_req, res) => {
    const t = Date.now();
    try {
      const { pool } = await import("./db");
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      res.json({ status: "ok", dbMs: Date.now() - t, uptime: Math.round(process.uptime()) });
    } catch (err) {
      res.status(503).json({ status: "error", dbMs: Date.now() - t, error: String(err) });
    }
  });

  // ============ ADMIN LOGIN ENDPOINT ============
  
  // Admin-specific login with stricter password validation
  app.post("/api/admin/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      console.log("Admin login attempt:", { email, passwordLength: password?.length });
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis" });
      }
      
      // Password validation: 10+ chars, letters, numbers, special chars
      if (password.length < 10) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 10 caractères" });
      }
      
      if (!/[a-zA-Z]/.test(password)) {
        return res.status(400).json({ error: "Le mot de passe doit contenir des lettres" });
      }
      
      if (!/\d/.test(password)) {
        return res.status(400).json({ error: "Le mot de passe doit contenir des chiffres" });
      }
      
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({ error: "Le mot de passe doit contenir des caractères spéciaux" });
      }
      
      // Find user by email
      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      // Check if user is admin
      if (user.role !== "admin") {
        console.log("Admin login - user is not admin:", user.role);
        return res.status(403).json({ error: "Accès réservé aux administrateurs" });
      }
      
      // Verify password
      if (!user.password) {
        return res.status(401).json({ error: "Compte non configuré pour l'authentification par mot de passe" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("Admin login - password valid:", isValidPassword);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      const rememberMe = req.body.rememberMe === true;

      const { token, sent, channel } = await createTwoFactorChallenge(email, user.id, rememberMe);
      
      const messages: Record<string, string> = {
        discord: "Un code de vérification a été envoyé sur votre canal Discord sécurisé.",
        email: "Un code de vérification a été envoyé à votre adresse email sécurisée.",
        none: "Code de vérification généré (vérifiez les logs serveur).",
      };

      return res.json({ 
        requires2FA: true, 
        twoFactorToken: token,
        message: messages[channel] || messages.none,
      });
    } catch (error) {
      console.error("Admin login error:", error);
      return res.status(500).json({ error: "Échec de la connexion" });
    }
  });

  app.post("/api/admin/verify-2fa", async (req, res) => {
    try {
      const { token, code } = req.body;
      
      if (!token || !code) {
        return res.status(400).json({ error: "Token et code requis" });
      }

      const result = verifyTwoFactorCode(token, code);
      
      if (!result.valid || !result.sessionData) {
        return res.status(401).json({ error: result.error || "Code invalide" });
      }

      const { userId, rememberMe } = result.sessionData;
      const sessionTtl = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

      const sessionUser = {
        claims: { sub: userId },
        expires_at: Math.floor(Date.now() / 1000) + sessionTtl,
        isLocalAuth: true,
      };

      req.session.cookie.maxAge = sessionTtl * 1000;

      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Échec de la connexion" });
        }
        return res.json({ success: true, message: "Connexion réussie" });
      });
    } catch (error) {
      console.error("Admin 2FA verify error:", error);
      return res.status(500).json({ error: "Échec de la vérification" });
    }
  });

  app.get("/api/landing-content", (_req, res) => {
    res.json(getLandingContent());
  });

  app.put("/api/admin/landing-content", async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });
    const user = await authStorage.getUser(userId);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Accès réservé aux administrateurs" });
    const validation = validateLandingContent(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    try {
      saveLandingContent(req.body);
      res.json({ success: true });
    } catch (err) {
      console.error("[Landing] Save error:", err);
      res.status(500).json({ error: "Échec de la sauvegarde" });
    }
  });

  // Pro login endpoint
  app.post("/api/pro/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis" });
      }
      
      // Password validation: 8+ chars, letters and numbers
      if (password.length < 8) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
      }
      
      if (!/[a-zA-Z]/.test(password)) {
        return res.status(400).json({ error: "Le mot de passe doit contenir des lettres" });
      }
      
      if (!/\d/.test(password)) {
        return res.status(400).json({ error: "Le mot de passe doit contenir des chiffres" });
      }
      
      // Find user by email
      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      // Check if user is restaurant owner
      if (user.role !== "restaurant_owner" && user.role !== "owner") {
        return res.status(403).json({ error: "Accès réservé aux propriétaires de restaurant" });
      }
      
      // Verify password
      if (!user.password) {
        return res.status(401).json({ error: "Compte non configuré pour l'authentification par mot de passe" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      const restaurant = await storage.getRestaurantByOwner(user.id);
      
      const rememberMe = req.body.rememberMe === true;
      const sessionTtl = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

      const sessionUser = {
        claims: { sub: user.id },
        expires_at: Math.floor(Date.now() / 1000) + sessionTtl,
        isLocalAuth: true,
      };

      req.session.cookie.maxAge = sessionTtl * 1000;
      
      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Échec de la connexion" });
        }
        return res.json({ 
          success: true, 
          message: "Connexion réussie",
          slug: restaurant?.slug || null
        });
      });
    } catch (error) {
      console.error("Pro login error:", error);
      return res.status(500).json({ error: "Échec de la connexion" });
    }
  });

  // ============ CLIENT AUTH ROUTES ============

  // Client registration endpoint
  app.post("/api/client/register", async (req, res, next) => {
    try {
      const { firstName, lastName, email, password, phone, address, slug } = req.body;
      
      if (!firstName || !email || !password) {
        return res.status(400).json({ error: "Prenom, email et mot de passe requis" });
      }
      
      if (!slug) {
        return res.status(400).json({ error: "Identifiant restaurant requis" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caracteres" });
      }
      
      // Validate restaurant strictly via slug - no restaurantId accepted
      const restaurant = await storage.getRestaurantBySlug(slug);
      if (!restaurant) {
        return res.status(400).json({ error: "Restaurant invalide" });
      }
      
      // Check if email already exists
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Cet email est deja utilise" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await authStorage.upsertUser({
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        address: address || null,
        role: "customer",
        restaurantId: restaurant.id,
      });
      
      const rememberMe = req.body.rememberMe === true;
      const sessionTtl = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

      const sessionUser = {
        claims: { sub: newUser.id },
        expires_at: Math.floor(Date.now() / 1000) + sessionTtl,
        isLocalAuth: true,
      };

      req.session.cookie.maxAge = sessionTtl * 1000;
      
      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Echec de la creation de session" });
        }
        
        // Notify Pro portal (customers list) and Admin portal (users list) of new customer
        realtimeSync.notifyCustomersUpdate(restaurant.id);
        realtimeSync.notifyUserUpdate(newUser.id, restaurant.id);
        
        return res.json({ 
          success: true, 
          message: "Compte cree avec succes",
          user: {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
          }
        });
      });
    } catch (error) {
      console.error("Client register error:", error);
      return res.status(500).json({ error: "Echec de l'inscription" });
    }
  });

  // Client login endpoint
  app.post("/api/client/login", async (req, res, next) => {
    try {
      const { email, password, slug } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis" });
      }
      
      if (!slug) {
        return res.status(400).json({ error: "Identifiant restaurant requis" });
      }
      
      // Validate restaurant strictly via slug - no restaurantId accepted
      const restaurant = await storage.getRestaurantBySlug(slug);
      if (!restaurant) {
        return res.status(400).json({ error: "Restaurant invalide" });
      }
      
      // Find user by email
      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      // Check if user is a customer
      if (user.role !== "customer") {
        return res.status(403).json({ error: "Veuillez utiliser le portail approprie pour votre compte" });
      }
      
      // Check if user belongs to this restaurant (using validated restaurant.id)
      if (user.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Ce compte n'est pas associe a ce restaurant" });
      }
      
      // Verify password
      if (!user.password) {
        return res.status(401).json({ error: "Compte non configure pour l'authentification par mot de passe" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      const rememberMe = req.body.rememberMe === true;
      const sessionTtl = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

      const sessionUser = {
        claims: { sub: user.id },
        expires_at: Math.floor(Date.now() / 1000) + sessionTtl,
        isLocalAuth: true,
      };

      req.session.cookie.maxAge = sessionTtl * 1000;
      
      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Echec de la connexion" });
        }
        return res.json({ 
          success: true, 
          message: "Connexion reussie",
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          }
        });
      });
    } catch (error) {
      console.error("Client login error:", error);
      return res.status(500).json({ error: "Echec de la connexion" });
    }
  });

  // ============ PUBLIC ROUTES ============
  
  // Get all restaurants (public - for customers)
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurantList = await storage.getRestaurants();
      res.json(stripSensitiveRestaurantList(restaurantList));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  // Get restaurant by slug (public) - MUST be before :id route
  app.get("/api/restaurants/slug/:slug", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantBySlug(req.params.slug);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(stripSensitiveRestaurantFields(restaurant));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // Get restaurant by ID (public)
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(stripSensitiveRestaurantFields(restaurant));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // Get categories for a restaurant (public)
  app.get("/api/restaurants/:id/categories", async (req, res) => {
    try {
      const categoryList = await storage.getCategories(req.params.id);
      res.json(categoryList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get dishes for a restaurant (public)
  app.get("/api/restaurants/:id/dishes", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      let dishList;
      if (categoryId) {
        dishList = await storage.getDishesByCategory(categoryId);
      } else {
        dishList = await storage.getDishes(req.params.id);
      }
      res.json(dishList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dishes" });
    }
  });

  // Get single order (authenticated - for customers viewing their own orders)
  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if the user is the customer who placed the order, or a restaurant owner, or admin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Allow access if user is admin, or if they placed the order, or if they own the restaurant
      const isAdmin = user.role === "admin";
      const isOrderOwner = order.customerId === userId;
      
      // Check if user owns the restaurant that this order belongs to
      const orderRestaurant = await storage.getRestaurant(order.restaurantId);
      const isRestaurantOwner = orderRestaurant && orderRestaurant.ownerId === userId;

      if (!isAdmin && !isOrderOwner && !isRestaurantOwner) {
        return res.status(403).json({ error: "Not authorized to view this order" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Get order invoice (PDF) - for delivered orders only
  app.get("/api/orders/:id/invoice", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Only allow invoice download for delivered orders
      if (order.status !== "delivered") {
        return res.status(403).json({ error: "Invoice only available for delivered orders" });
      }

      // Check authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const isAdmin = user.role === "admin";
      const isOrderOwner = order.customerId === userId;
      const orderRestaurant = await storage.getRestaurant(order.restaurantId);
      const isRestaurantOwner = orderRestaurant && orderRestaurant.ownerId === userId;

      if (!isAdmin && !isOrderOwner && !isRestaurantOwner) {
        return res.status(403).json({ error: "Not authorized to view this invoice" });
      }

      // Generate invoice PDF using jspdf
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text("FACTURE", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Commande #${order.id.slice(-6)}`, 20, 35);
      doc.text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }) : ""}`, 20, 42);

      // Restaurant info
      if (orderRestaurant) {
        doc.setFontSize(14);
        doc.text(orderRestaurant.name, 20, 55);
        doc.setFontSize(10);
        if (orderRestaurant.address) doc.text(orderRestaurant.address, 20, 62);
        if (orderRestaurant.phone) doc.text(`Tel: ${orderRestaurant.phone}`, 20, 69);
        
        // Bank info
        if (orderRestaurant.bankAccountHolder || orderRestaurant.bankIban) {
          doc.text("Informations bancaires:", 20, 80);
          if (orderRestaurant.bankAccountHolder) doc.text(`Titulaire: ${orderRestaurant.bankAccountHolder}`, 20, 87);
          if (orderRestaurant.bankIban) doc.text(`IBAN: ${orderRestaurant.bankIban}`, 20, 94);
          if (orderRestaurant.bankBic) doc.text(`BIC: ${orderRestaurant.bankBic}`, 20, 101);
        }
      }

      // Customer info
      doc.setFontSize(12);
      doc.text("Client:", 120, 55);
      doc.setFontSize(10);
      doc.text(order.customerName || "", 120, 62);
      if (order.customerPhone) doc.text(order.customerPhone, 120, 69);
      if (order.customerAddress) doc.text(order.customerAddress, 120, 76);

      // Items table
      let yPos = 115;
      doc.setFontSize(11);
      doc.text("Article", 20, yPos);
      doc.text("Qte", 120, yPos);
      doc.text("Prix", 145, yPos);
      doc.text("Total", 170, yPos);
      
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 8;

      doc.setFontSize(10);
      const items = (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) as Array<{ name: string; quantity: number; price: number }>;
      for (const item of items) {
        const lineTotal = item.price * item.quantity;
        doc.text(item.name.substring(0, 40), 20, yPos);
        doc.text(String(item.quantity), 120, yPos);
        doc.text(`${item.price.toFixed(2)} EUR`, 145, yPos);
        doc.text(`${lineTotal.toFixed(2)} EUR`, 170, yPos);
        yPos += 7;
      }

      // Total
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`TOTAL: ${order.total?.toFixed(2)} EUR`, 170, yPos, { align: "right" });

      // Type
      yPos += 15;
      doc.setFontSize(10);
      doc.text(`Type: ${order.orderType === "delivery" ? "Livraison" : "A emporter"}`, 20, yPos);

      // Output PDF
      const pdfBuffer = doc.output("arraybuffer");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=facture-${order.id.slice(-6)}.pdf`);
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error("Invoice generation error:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  // Create order (customers only)
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      // Verify user is authenticated and is a customer
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Connexion requise" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "customer") {
        return res.status(403).json({ error: "Seuls les clients peuvent passer des commandes" });
      }

      const parsed = createOrderRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid order data", details: parsed.error.errors });
      }

      const { restaurantId, items, customerName, customerPhone, customerAddress, customerPostalCode, orderType } = parsed.data;

      // Verify restaurant exists
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(400).json({ error: "Restaurant not found" });
      }

      // Sanitize user inputs
      const sanitizedName = sanitizeString(customerName);
      const sanitizedPhone = sanitizeString(customerPhone);
      const sanitizedAddress = customerAddress ? sanitizeString(customerAddress) : null;
      const sanitizedPostalCode = customerPostalCode ? sanitizeString(customerPostalCode) : null;

      if (sanitizedName.length < 2 || sanitizedName.length > 100) {
        return res.status(400).json({ error: "Customer name must be between 2 and 100 characters" });
      }

      if (!isValidPhone(sanitizedPhone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      if (orderType === "delivery" && (!sanitizedAddress || sanitizedAddress.length < 5)) {
        return res.status(400).json({ error: "Valid delivery address is required for delivery orders" });
      }

      // Check delivery zone if restaurant has delivery zip codes configured
      if (orderType === "delivery" && restaurant.deliveryZipCodes && restaurant.deliveryZipCodes.length > 0) {
        if (!sanitizedPostalCode) {
          return res.status(403).json({ 
            error: "DELIVERY_ZONE_REQUIRED",
            message: "Le code postal est requis pour la livraison" 
          });
        }
        
        // Normalize postal code (trim whitespace)
        const normalizedPostalCode = sanitizedPostalCode.trim();
        
        if (!restaurant.deliveryZipCodes.includes(normalizedPostalCode)) {
          return res.status(403).json({ 
            error: "DELIVERY_ZONE_NOT_AVAILABLE",
            message: "Désolé, nous ne livrons pas dans cette zone. Veuillez vérifier les codes postaux de livraison disponibles.",
            allowedZipCodes: restaurant.deliveryZipCodes
          });
        }
      }

      // Check if order is within service hours
      const restaurantServices = await storage.getRestaurantServices(restaurantId);
      if (restaurantServices.length > 0) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Convert HH:MM to total minutes for numeric comparison
        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const isWithinServiceHours = restaurantServices.some(service => {
          const startMinutes = timeToMinutes(service.startTime);
          const endMinutes = timeToMinutes(service.endTime);
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        });
        
        if (!isWithinServiceHours) {
          const serviceHoursText = restaurantServices
            .map(s => `${s.name}: ${s.startTime} - ${s.endTime}`)
            .join(", ");
          return res.status(403).json({ 
            error: "OUTSIDE_SERVICE_HOURS",
            message: `Désolé, les commandes ne sont pas acceptées en dehors des horaires de service. Horaires: ${serviceHoursText}`,
            services: restaurantServices.map(s => ({ name: s.name, startTime: s.startTime, endTime: s.endTime }))
          });
        }
      }

      let calculatedTotal = 0;
      const validatedItems: ValidatedOrderItem[] = [];

      for (const item of items) {
        if (!validator.isUUID(item.dishId)) {
          return res.status(400).json({ error: "Invalid dish ID format" });
        }

        const dish = await storage.getDish(item.dishId);
        if (!dish) {
          return res.status(400).json({ error: `Dish not found: ${item.dishId}` });
        }
        if (dish.restaurantId !== restaurantId) {
          return res.status(400).json({ error: "Dish does not belong to this restaurant" });
        }
        if (!dish.isAvailable) {
          return res.status(400).json({ error: `Dish is not available: ${dish.name}` });
        }

        if (item.quantity < 1 || item.quantity > 99) {
          return res.status(400).json({ error: "Quantity must be between 1 and 99" });
        }

        calculatedTotal += dish.price * item.quantity;
        validatedItems.push({
          dishId: item.dishId,
          quantity: item.quantity,
          name: dish.name,
          price: dish.price,
        });
      }

      const order = await storage.createOrder({
        restaurantId,
        customerId: userId,
        items: JSON.stringify(validatedItems),
        total: calculatedTotal,
        customerName: sanitizedName,
        customerPhone: sanitizedPhone,
        customerAddress: sanitizedAddress,
        orderType,
      });
      
      // Track order to COBA monitoring
      trackCobaEvent('order', {
        orderId: order.id,
        restaurantId,
        customerId: userId,
        total: calculatedTotal,
        itemCount: validatedItems.length,
        orderType,
      }, restaurantId);
      
      realtimeSync.notifyNewOrder(order.restaurantId, order);
      
      pushOrderToHubRise(restaurantId, {
        id: order.id,
        customerName: sanitizedName,
        customerPhone: sanitizedPhone,
        customerAddress: sanitizedAddress,
        orderType,
        total: calculatedTotal,
        items: JSON.stringify(validatedItems),
      }).catch(err => console.error("[HubRise] Auto-push failed:", err));

      const emailData = {
        orderId: order.id,
        restaurantName: restaurant.name,
        customerName: sanitizedName,
        customerPhone: sanitizedPhone,
        customerAddress: sanitizedAddress,
        orderType,
        total: calculatedTotal,
        items: validatedItems,
      };

      const ownerUser = await storage.getUser(restaurant.ownerId);
      if (ownerUser?.email) {
        sendNewOrderEmailToRestaurant(ownerUser.email, emailData).catch(e => console.error("[Email] Restaurant notification failed:", e));
      }
      if (user?.email) {
        sendOrderConfirmationToCustomer(user.email, emailData).catch(e => console.error("[Email] Customer confirmation failed:", e));
      }

      pushNewOrderToRestaurant(restaurantId, order.id, sanitizedName, calculatedTotal, orderType).catch(e => console.error("[Push] Restaurant notification failed:", e));

      if (userId && restaurant.loyaltyEnabled) {
        const pointsEarned = Math.floor(calculatedTotal * (restaurant.loyaltyPointsPerEuro ?? 10));
        if (pointsEarned > 0) {
          storage.upsertCustomerLoyalty(userId, restaurantId, pointsEarned, "earn").catch(() => {});
          storage.createLoyaltyTransaction({
            customerId: userId,
            restaurantId,
            orderId: order.id,
            type: "earn",
            points: pointsEarned,
            description: `Commande #${order.id.slice(0, 8)} — ${calculatedTotal.toFixed(2)}€`,
          }).catch(() => {});
        }
      }
      
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // ============ LOYALTY ROUTES ============

  app.get("/api/loyalty/:restaurantId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const loyalty = await storage.getCustomerLoyalty(userId, req.params.restaurantId);
      const restaurant = await storage.getRestaurant(req.params.restaurantId);
      res.json({
        points: loyalty?.points ?? 0,
        totalEarned: loyalty?.totalEarned ?? 0,
        totalRedeemed: loyalty?.totalRedeemed ?? 0,
        config: restaurant ? {
          enabled: restaurant.loyaltyEnabled ?? false,
          pointsPerEuro: restaurant.loyaltyPointsPerEuro ?? 10,
          pointsToRedeem: restaurant.loyaltyPointsToRedeem ?? 100,
          rewardValue: restaurant.loyaltyRewardValue ?? 5,
        } : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loyalty data" });
    }
  });

  app.get("/api/loyalty/:restaurantId/transactions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const transactions = await storage.getLoyaltyTransactions(userId, req.params.restaurantId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loyalty transactions" });
    }
  });

  app.post("/api/loyalty/:restaurantId/redeem", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const restaurant = await storage.getRestaurant(req.params.restaurantId);
      if (!restaurant || !restaurant.loyaltyEnabled) {
        return res.status(400).json({ error: "Programme de fidélité non activé" });
      }

      const loyalty = await storage.getCustomerLoyalty(userId, req.params.restaurantId);
      const pointsNeeded = restaurant.loyaltyPointsToRedeem ?? 100;
      if (!loyalty || loyalty.points < pointsNeeded) {
        return res.status(400).json({ error: "Points insuffisants", required: pointsNeeded, current: loyalty?.points ?? 0 });
      }

      const rewardValue = restaurant.loyaltyRewardValue ?? 5;
      await storage.upsertCustomerLoyalty(userId, req.params.restaurantId, pointsNeeded, "redeem");
      await storage.createLoyaltyTransaction({
        customerId: userId,
        restaurantId: req.params.restaurantId,
        type: "redeem",
        points: pointsNeeded,
        description: `Réduction de ${rewardValue.toFixed(2)}€ utilisée`,
      });

      res.json({ success: true, rewardValue, pointsUsed: pointsNeeded });
    } catch (error) {
      res.status(500).json({ error: "Failed to redeem loyalty points" });
    }
  });

  app.patch("/api/my-restaurant/loyalty", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: "User not found" });
      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

      const { loyaltyEnabled, loyaltyPointsPerEuro, loyaltyPointsToRedeem, loyaltyRewardValue } = req.body;
      const updates: any = {};
      if (typeof loyaltyEnabled === "boolean") updates.loyaltyEnabled = loyaltyEnabled;
      if (typeof loyaltyPointsPerEuro === "number" && loyaltyPointsPerEuro >= 1) updates.loyaltyPointsPerEuro = loyaltyPointsPerEuro;
      if (typeof loyaltyPointsToRedeem === "number" && loyaltyPointsToRedeem >= 1) updates.loyaltyPointsToRedeem = loyaltyPointsToRedeem;
      if (typeof loyaltyRewardValue === "number" && loyaltyRewardValue >= 0) updates.loyaltyRewardValue = loyaltyRewardValue;

      const updated = await storage.updateRestaurant(restaurant.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update loyalty settings" });
    }
  });

  // ============ STRIPE ROUTES ============

  app.post("/api/admin/billing/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });

      const { restaurantId, plan } = req.body;
      if (!restaurantId || !plan || !PLANS[plan as keyof typeof PLANS]) {
        return res.status(400).json({ error: "Invalid restaurant or plan" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

      const owner = await storage.getUser(restaurant.ownerId);
      const email = owner?.email || "unknown@macommande.shop";

      const url = await createSubscriptionCheckout(restaurantId, restaurant.name, email, plan as keyof typeof PLANS);
      if (!url) return res.status(500).json({ error: "Stripe non configuré (STRIPE_SECRET_KEY manquant)" });

      res.json({ url });
    } catch (error) {
      console.error("[Stripe] Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/orders/:orderId/pay", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });

      const restaurant = await storage.getRestaurant(order.restaurantId);
      if (!restaurant || !restaurant.stripeConnected || !restaurant.stripeSecretKey) {
        return res.status(400).json({ error: "Paiement en ligne non disponible pour ce restaurant" });
      }

      const items = JSON.parse(order.items) as { name: string; price: number; quantity: number }[];
      const result = await createOrderCheckoutSession(
        restaurant.stripeSecretKey,
        order.id,
        items,
        req.body.email,
      );

      if (!result) return res.status(500).json({ error: "Failed to create payment session" });
      res.json(result);
    } catch (error) {
      console.error("[Stripe] Order payment error:", error);
      res.status(500).json({ error: "Failed to create payment session" });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(400).send("Stripe not configured");

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      let event;
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } else {
        event = req.body;
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const restaurantId = session.metadata?.restaurantId;
          if (restaurantId && session.mode === "subscription") {
            await storage.updateRestaurant(restaurantId, {
              subscriptionStatus: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStartDate: new Date(),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
          }
          if (session.metadata?.orderId) {
            await storage.updateOrderStatus(session.metadata.orderId, "confirmed");
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const allRestaurants = await storage.getRestaurants();
          const restaurant = allRestaurants.find(r => r.stripeSubscriptionId === sub.id);
          if (restaurant) {
            await storage.updateRestaurant(restaurant.id, { subscriptionStatus: "cancelled" });
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const allRestaurants = await storage.getRestaurants();
          const restaurant = allRestaurants.find(r => r.stripeCustomerId === invoice.customer);
          if (restaurant) {
            await storage.updateRestaurant(restaurant.id, { subscriptionStatus: "paused" });
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Stripe] Webhook error:", error);
      res.status(400).send("Webhook Error");
    }
  });

  // ============ ADMIN ROUTES (Platform Admin) ============
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all orders across all restaurants (admin only)
  app.get("/api/admin/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Update user role (admin only, master admin required for admin role)
  app.patch("/api/admin/users/:id/role", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { role } = req.body;
      if (!role || !["customer", "owner", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only master admin can assign admin role
      if (role === "admin" && user.isMasterAdmin !== "true") {
        return res.status(403).json({ error: "Seul l'administrateur principal peut attribuer le rôle administrateur" });
      }

      // Cannot demote master admin
      if (targetUser.isMasterAdmin === "true" && role !== "admin") {
        return res.status(403).json({ error: "Impossible de rétrograder l'administrateur principal" });
      }

      const updatedUser = await storage.updateUser(req.params.id, { role });
      if (updatedUser) {
        const { password: _, ...safeUser } = updatedUser;
        res.json(safeUser);
      } else {
        res.json(updatedUser);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Update user info (master admin only for email/password/role, admin for other fields)
  app.patch("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { firstName, lastName, email, password, phone, address, role, profileImageUrl, restaurantId } = req.body;
      
      // Only master admin can update login credentials (email/password) and role
      const isMasterAdmin = user.isMasterAdmin === "true";
      if ((email !== undefined || (password !== undefined && password.length > 0) || role !== undefined) && !isMasterAdmin) {
        return res.status(403).json({ error: "Seul l'administrateur principal peut modifier les identifiants de connexion et le role" });
      }
      
      // Cannot demote master admin
      if (targetUser.isMasterAdmin === "true" && role !== undefined && role !== "admin") {
        return res.status(403).json({ error: "Impossible de retrograder l'administrateur principal" });
      }
      
      // Only master admin can assign admin role
      if (role === "admin" && !isMasterAdmin) {
        return res.status(403).json({ error: "Seul l'administrateur principal peut attribuer le role administrateur" });
      }
      
      const updateData: Partial<{ firstName: string; lastName: string; email: string; password: string; phone: string; address: string; role: string; profileImageUrl: string; restaurantId: string }> = {};
      
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (role !== undefined) updateData.role = role;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (restaurantId !== undefined) updateData.restaurantId = restaurantId;
      
      // Hash password if provided
      if (password !== undefined && password.length > 0) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await storage.updateUser(req.params.id, updateData);
      
      // Notify all portals about user update
      realtimeSync.notifyUserUpdate(req.params.id, targetUser.restaurantId || undefined);
      
      if (updatedUser) {
        const { password: _, ...safeUser } = updatedUser;
        res.json(safeUser);
      } else {
        res.json(updatedUser);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Create restaurant (admin only)
  app.post("/api/admin/restaurants", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parsed = insertRestaurantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid restaurant data", details: parsed.error.errors });
      }

      const restaurant = await storage.createRestaurant(parsed.data);
      
      if (parsed.data.ownerId) {
        const owner = await storage.getUser(parsed.data.ownerId);
        if (owner) {
          const updates: Record<string, any> = {};
          if (owner.role === "customer") {
            updates.role = "owner";
          }
          const contactName = parsed.data.contactName || "";
          const nameParts = contactName.trim().split(/\s+/);
          if (nameParts.length > 0 && !owner.firstName) {
            updates.firstName = nameParts[0];
          }
          if (nameParts.length > 1 && !owner.lastName) {
            updates.lastName = nameParts.slice(1).join(" ");
          }
          if (parsed.data.contactPhone && !owner.phone) {
            updates.phone = parsed.data.contactPhone;
          }
          if (parsed.data.address && !owner.address) {
            updates.address = parsed.data.address;
          }
          if (Object.keys(updates).length > 0) {
            await storage.updateUser(parsed.data.ownerId, updates);
          }
        }
      }
      
      realtimeSync.notifyRestaurantUpdate(restaurant.id, "created");
      res.status(201).json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to create restaurant" });
    }
  });

  // Update restaurant (admin only)
  app.patch("/api/admin/restaurants/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const parseResult = updateRestaurantSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid restaurant data", details: parseResult.error.errors });
      }

      if (parseResult.data.slug && parseResult.data.slug !== restaurant.slug) {
        const existing = await storage.getRestaurantBySlug(parseResult.data.slug);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ error: "Cette URL est déjà utilisée par un autre restaurant" });
        }
      }

      const updated = await storage.updateRestaurant(req.params.id, parseResult.data);
      realtimeSync.notifyRestaurantUpdate(req.params.id, "updated");
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });

  // Get presigned upload URL for restaurant logo (master admin only)
  app.post("/api/admin/restaurants/:id/logo/upload-url", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin" || user.isMasterAdmin !== "true") {
        return res.status(403).json({ error: "Seul l'administrateur principal peut télécharger des logos" });
      }

      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error generating logo upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Delete restaurant (admin only)
  app.delete("/api/admin/restaurants/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Optionally downgrade the owner back to customer if they have no other restaurants
      if (restaurant.ownerId) {
        const ownerRestaurant = await storage.getRestaurantByOwner(restaurant.ownerId);
        if (ownerRestaurant && ownerRestaurant.id === restaurant.id) {
          await storage.updateUser(restaurant.ownerId, { role: "customer" });
        }
      }

      await storage.deleteRestaurant(req.params.id);
      realtimeSync.notifyRestaurantUpdate(req.params.id, "deleted");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });

  app.get("/api/admin/hubrise-config", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });

      res.json({
        clientId: process.env.HUBRISE_CLIENT_ID || "",
        clientSecret: process.env.HUBRISE_CLIENT_SECRET || "",
        configured: !!(process.env.HUBRISE_CLIENT_ID && process.env.HUBRISE_CLIENT_SECRET),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get HubRise config" });
    }
  });

  app.post("/api/admin/hubrise-config", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required" });

      const { clientId, clientSecret } = req.body;
      if (typeof clientId !== "string" || typeof clientSecret !== "string") {
        return res.status(400).json({ error: "clientId and clientSecret are required" });
      }

      process.env.HUBRISE_CLIENT_ID = clientId.trim();
      process.env.HUBRISE_CLIENT_SECRET = clientSecret.trim();

      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";
      try { envContent = fs.readFileSync(envPath, "utf-8"); } catch {}

      const setEnvVar = (content: string, key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        }
        return content + (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${value}\n`;
      };

      envContent = setEnvVar(envContent, "HUBRISE_CLIENT_ID", clientId.trim());
      envContent = setEnvVar(envContent, "HUBRISE_CLIENT_SECRET", clientSecret.trim());
      fs.writeFileSync(envPath, envContent);

      if (clientId.trim() && clientSecret.trim()) {
        try {
          registerHubRiseRoutes(app);
        } catch {}
      }

      res.json({ success: true, configured: !!(clientId.trim() && clientSecret.trim()) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update HubRise config" });
    }
  });

  // ============ INTEGRATION CREDENTIALS (Restaurant Owner) ============

  app.get("/api/my-restaurant/integrations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || !user.restaurantId) return res.status(403).json({ error: "No restaurant" });
      const restaurant = await storage.getRestaurant(user.restaurantId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      res.json({
        hubrise: {
          accessToken: restaurant.hubriseAccessToken || "",
          locationId: restaurant.hubriseLocationId || "",
          catalogId: restaurant.hubriseCatalogId || "",
          connected: restaurant.hubriseConnected || false,
        },
        stripe: {
          accountId: restaurant.stripeAccountId || "",
          publishableKey: restaurant.stripePublishableKey || "",
          secretKey: restaurant.stripeSecretKey ? "••••••••" : "",
          connected: restaurant.stripeConnected || false,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get integrations" });
    }
  });

  app.patch("/api/my-restaurant/integrations/hubrise", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || !user.restaurantId) return res.status(403).json({ error: "No restaurant" });
      const { accessToken, locationId, catalogId } = req.body;
      const updates: Record<string, any> = {};
      if (accessToken !== undefined) updates.hubriseAccessToken = accessToken.trim() || null;
      if (locationId !== undefined) updates.hubriseLocationId = locationId.trim() || null;
      if (catalogId !== undefined) updates.hubriseCatalogId = catalogId.trim() || null;
      updates.hubriseConnected = !!(accessToken?.trim() && locationId?.trim());
      await storage.updateRestaurant(user.restaurantId, updates);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update HubRise credentials" });
    }
  });

  app.patch("/api/my-restaurant/integrations/stripe", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || !user.restaurantId) return res.status(403).json({ error: "No restaurant" });
      const { accountId, publishableKey, secretKey } = req.body;
      const updates: Record<string, any> = {};
      if (accountId !== undefined) updates.stripeAccountId = accountId.trim() || null;
      if (publishableKey !== undefined) updates.stripePublishableKey = publishableKey.trim() || null;
      if (secretKey !== undefined && secretKey !== "••••••••") updates.stripeSecretKey = secretKey.trim() || null;
      updates.stripeConnected = !!(publishableKey?.trim() && (secretKey?.trim() && secretKey !== "••••••••"));
      await storage.updateRestaurant(user.restaurantId, updates);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update Stripe credentials" });
    }
  });

  // ============ CUSTOMER ROUTES ============
  
  // Update current user's profile
  app.patch("/api/my-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { firstName, lastName, phone, address } = req.body;
      
      const updates: Record<string, string | null> = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;
      if (address !== undefined) updates.address = address;
      
      const updatedUser = await storage.updateUser(userId, updates);
      
      // Notify all portals about user update
      const currentUser = await storage.getUser(userId);
      realtimeSync.notifyUserUpdate(userId, currentUser?.restaurantId || undefined);
      
      if (updatedUser) {
        const { password: _, ...safeUser } = updatedUser;
        res.json(safeUser);
      } else {
        res.json(updatedUser);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/my-profile/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }

      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Le mot de passe actuel est requis" });
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return res.status(400).json({ error: "Mot de passe actuel incorrect" });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });

      if (req.session) {
        req.session.regenerate((err: any) => {
          if (err) console.error("Session regeneration error:", err);
        });
      }

      res.json({ message: "Mot de passe mis a jour avec succes" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
    }
  });

  app.delete("/api/my-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { password } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }

      if (user.role === "admin") {
        return res.status(403).json({ error: "Les comptes admin ne peuvent pas etre supprimes" });
      }

      if (user.password) {
        if (!password) {
          return res.status(400).json({ error: "Le mot de passe est requis pour supprimer le compte" });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(400).json({ error: "Mot de passe incorrect" });
        }
      }

      await storage.deleteUser(userId);

      req.logout(() => {
        res.json({ message: "Compte supprime avec succes" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ error: "Erreur lors de la suppression du compte" });
    }
  });

  // Get current customer's order history
  app.get("/api/my-orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const orders = await storage.getOrdersByCustomer(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // ============ RESTAURANT OWNER ROUTES ============

  // Get current user's restaurant
  app.get("/api/my-restaurant", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const restaurant = await storage.getRestaurantByOwner(userId);
      res.json(restaurant || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // Update current user's restaurant (owners can still update their own settings)
  app.patch("/api/my-restaurant", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Validate and sanitize update data
      const parseResult = updateRestaurantSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid restaurant data", details: parseResult.error.errors });
      }

      const updated = await storage.updateRestaurant(restaurant.id, parseResult.data);
      realtimeSync.notifySettingsUpdate(restaurant.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });

  // Get categories for current user's restaurant
  app.get("/api/my-restaurant/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const categoryList = await storage.getCategories(restaurant.id);
      res.json(categoryList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get dishes for current user's restaurant
  app.get("/api/my-restaurant/dishes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const dishList = await storage.getDishes(restaurant.id);
      res.json(dishList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dishes" });
    }
  });

  // Get restaurant statistics
  app.get("/api/my-restaurant/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== "owner" && user.role !== "admin" && user.role !== "restaurant_owner")) {
        return res.status(403).json({ error: "Only restaurant owners can access statistics" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const stats = await storage.getRestaurantStats(restaurant.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Get customers for current user's restaurant
  app.get("/api/my-restaurant/customers", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== "restaurant_owner" && user.role !== "admin")) {
        return res.status(403).json({ error: "Only restaurant owners can access customer list" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const customers = await storage.getRestaurantCustomers(restaurant.id);
      const safeCustomers = customers.map(({ ...u }) => u);
      res.json(safeCustomers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Update customer credentials (Pro only)
  app.patch("/api/my-restaurant/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== "restaurant_owner" && user.role !== "admin")) {
        return res.status(403).json({ error: "Only restaurant owners can update customer credentials" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Verify this customer belongs to this restaurant
      const customers = await storage.getRestaurantCustomers(restaurant.id);
      const customerExists = customers.some(c => c.id === req.params.id);
      if (!customerExists) {
        return res.status(404).json({ error: "Customer not found for this restaurant" });
      }

      const { email, password } = req.body;
      const updateData: Partial<{ email: string; password: string }> = {};

      if (email !== undefined && email.length > 0) {
        updateData.email = email;
      }
      
      if (password !== undefined && password.length > 0) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }

      const updatedUser = await storage.updateUser(req.params.id, updateData);
      
      // Notify all portals about customer update
      realtimeSync.notifyUserUpdate(req.params.id, restaurant.id);
      
      if (updatedUser) {
        const { password: _, ...safeUser } = updatedUser;
        res.json(safeUser);
      } else {
        res.json(updatedUser);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Delete customer account (Pro only)
  app.delete("/api/my-restaurant/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== "restaurant_owner" && user.role !== "admin")) {
        return res.status(403).json({ error: "Only restaurant owners can delete customer accounts" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Verify this customer belongs to this restaurant
      const customers = await storage.getRestaurantCustomers(restaurant.id);
      const customerExists = customers.some(c => c.id === req.params.id);
      if (!customerExists) {
        return res.status(404).json({ error: "Customer not found for this restaurant" });
      }

      await storage.deleteUser(req.params.id);
      
      // Notify all portals about customer deletion
      realtimeSync.notifyUserDeleted(req.params.id, restaurant.id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Get orders for current user's restaurant
  app.get("/api/my-restaurant/orders", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const orderList = await storage.getOrders(restaurant.id);
      res.json(orderList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Update order status for restaurant owner
  app.patch("/api/my-restaurant/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || order.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized to update this order" });
      }

      const VALID_STATUSES = ["pending", "confirmed", "preparing", "ready", "delivered", "picked_up", "cancelled"];
      const { status } = req.body;
      if (!status || typeof status !== "string" || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const updated = await storage.updateOrderStatus(req.params.id, status);
      realtimeSync.notifyOrderStatusUpdate(restaurant.id, req.params.id, status, order.customerId || undefined);

      if (order.customerId) {
        const customer = await storage.getUser(order.customerId);
        if (customer?.email) {
          sendOrderStatusUpdateToCustomer({
            orderId: order.id,
            restaurantName: restaurant.name,
            customerName: order.customerName,
            status,
            customerEmail: customer.email,
          }).catch(e => console.error("[Email] Status email failed:", e));
        }
        pushOrderStatusToCustomer(order.customerId, order.id, restaurant.name, status).catch(e => console.error("[Push] Status notification failed:", e));
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Update order status (legacy route)
  app.patch("/api/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify order belongs to user's restaurant
      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || order.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized to update this order" });
      }

      const VALID_STATUSES = ["pending", "confirmed", "preparing", "ready", "delivered", "picked_up", "cancelled"];
      const { status } = req.body;
      if (!status || typeof status !== "string" || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const updated = await storage.updateOrderStatus(req.params.id, status);

      if (order.customerId) {
        const customer = await storage.getUser(order.customerId);
        if (customer?.email) {
          sendOrderStatusUpdateToCustomer({
            orderId: order.id,
            restaurantName: restaurant.name,
            customerName: order.customerName,
            status,
            customerEmail: customer.email,
          }).catch(e => console.error("[Email] Status email failed:", e));
        }
        pushOrderStatusToCustomer(order.customerId, order.id, restaurant.name, status).catch(e => console.error("[Push] Status notification failed:", e));
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // ============ PUSH SUBSCRIPTION MANAGEMENT ============

  app.post("/api/push/subscribe", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { endpoint, p256dh, auth, restaurantId } = req.body;
      if (!endpoint || typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
        return res.status(400).json({ error: "Invalid push endpoint" });
      }
      if (!p256dh || typeof p256dh !== "string" || !auth || typeof auth !== "string") {
        return res.status(400).json({ error: "Missing push subscription keys" });
      }
      if (endpoint.length > 2000 || p256dh.length > 200 || auth.length > 200) {
        return res.status(400).json({ error: "Push subscription data too large" });
      }
      if (restaurantId && (typeof restaurantId !== "string" || restaurantId.length > 100)) {
        return res.status(400).json({ error: "Invalid restaurantId" });
      }

      const sub = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh,
        auth,
        restaurantId: restaurantId || null,
      });
      res.json({ success: true, id: sub.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to subscribe to push notifications" });
    }
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { endpoint } = req.body;
      if (!endpoint || typeof endpoint !== "string") {
        return res.status(400).json({ error: "Missing endpoint" });
      }

      const subs = await storage.getPushSubscriptions(userId);
      const match = subs.find(s => s.endpoint === endpoint);
      if (match) {
        await storage.deletePushSubscription(match.id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unsubscribe from push notifications" });
    }
  });

  app.get("/api/push/vapid-key", (_req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(404).json({ error: "Push not configured" });
    res.json({ publicKey: key });
  });

  // ============ CATEGORY MANAGEMENT ============

  // Create category for user's restaurant
  app.post("/api/my-restaurant/categories", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const parsed = insertCategorySchema.safeParse({ ...req.body, restaurantId: restaurant.id });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid category data", details: parsed.error.errors });
      }

      const category = await storage.createCategory(parsed.data);
      realtimeSync.notifyMenuUpdate(restaurant.id, "category_created", category.id);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Update category (new path)
  app.patch("/api/my-restaurant/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || category.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateCategory(req.params.id, req.body);
      realtimeSync.notifyMenuUpdate(restaurant.id, "category_updated", req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // Delete category (new path)
  app.delete("/api/my-restaurant/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || category.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteCategory(req.params.id);
      realtimeSync.notifyMenuUpdate(restaurant.id, "category_deleted", req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.put("/api/my-restaurant/categories/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) return res.status(400).json({ error: "orderedIds array required" });

      const ownedCategories = await storage.getCategories(restaurant.id);
      const ownedIdSet = new Set(ownedCategories.map(c => c.id));
      for (const id of orderedIds) {
        if (!ownedIdSet.has(id)) return res.status(403).json({ error: "Not authorized to reorder these categories" });
      }

      for (let i = 0; i < orderedIds.length; i++) {
        await storage.updateCategory(orderedIds[i], { sortOrder: i });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder categories" });
    }
  });

  app.put("/api/my-restaurant/dishes/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) return res.status(400).json({ error: "orderedIds array required" });

      const ownedDishes = await storage.getDishes(restaurant.id);
      const ownedIdSet = new Set(ownedDishes.map(d => d.id));
      for (const id of orderedIds) {
        if (!ownedIdSet.has(id)) return res.status(403).json({ error: "Not authorized to reorder these dishes" });
      }

      for (let i = 0; i < orderedIds.length; i++) {
        await storage.updateDish(orderedIds[i], { sortOrder: i });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder dishes" });
    }
  });

  // Update dish (new path)
  app.patch("/api/my-restaurant/dishes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dish = await storage.getDish(req.params.id);
      if (!dish) {
        return res.status(404).json({ error: "Dish not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || dish.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateDish(req.params.id, req.body);
      realtimeSync.notifyMenuUpdate(restaurant.id, "dish_updated", req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update dish" });
    }
  });

  // Delete dish (new path)
  app.delete("/api/my-restaurant/dishes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dish = await storage.getDish(req.params.id);
      if (!dish) {
        return res.status(404).json({ error: "Dish not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || dish.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteDish(req.params.id);
      realtimeSync.notifyMenuUpdate(restaurant.id, "dish_deleted", req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dish" });
    }
  });

  // Update category (legacy path)
  app.patch("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || category.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateCategory(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // Delete category
  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || category.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ============ DISH MANAGEMENT ============

  // Create dish for user's restaurant
  app.post("/api/my-restaurant/dishes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const parsed = insertDishSchema.safeParse({ ...req.body, restaurantId: restaurant.id });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid dish data", details: parsed.error.errors });
      }

      const dish = await storage.createDish(parsed.data);
      realtimeSync.notifyMenuUpdate(restaurant.id, "dish_created", dish.id);
      res.status(201).json(dish);
    } catch (error) {
      res.status(500).json({ error: "Failed to create dish" });
    }
  });

  // Update dish
  app.patch("/api/dishes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dish = await storage.getDish(req.params.id);
      if (!dish) {
        return res.status(404).json({ error: "Dish not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || dish.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updated = await storage.updateDish(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update dish" });
    }
  });

  // Delete dish
  app.delete("/api/dishes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dish = await storage.getDish(req.params.id);
      if (!dish) {
        return res.status(404).json({ error: "Dish not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || dish.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteDish(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete dish" });
    }
  });

  // ============ RESTAURANT GALLERY PHOTOS ============
  
  // Get restaurant photos (public)
  app.get("/api/restaurants/:id/photos", async (req, res) => {
    try {
      const photos = await storage.getRestaurantPhotos(req.params.id);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  // Get photos for my restaurant (owner)
  app.get("/api/my-restaurant/photos", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const photos = await storage.getRestaurantPhotos(restaurant.id);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  // Add photo to my restaurant (owner)
  app.post("/api/my-restaurant/photos", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const { imageUrl, caption, sortOrder } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      const photo = await storage.createRestaurantPhoto({
        restaurantId: restaurant.id,
        imageUrl: sanitizeString(imageUrl),
        caption: caption ? sanitizeString(caption) : null,
        sortOrder: sortOrder || 0,
      });
      realtimeSync.notifyGalleryUpdate(restaurant.id, "photo_added", photo.id);
      res.status(201).json(photo);
    } catch (error) {
      res.status(500).json({ error: "Failed to add photo" });
    }
  });

  // Update photo (owner)
  app.patch("/api/my-restaurant/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const photo = await storage.getRestaurantPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || photo.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updates: any = {};
      if (req.body.caption !== undefined) updates.caption = req.body.caption ? sanitizeString(req.body.caption) : null;
      if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;

      const updated = await storage.updateRestaurantPhoto(req.params.id, updates);
      realtimeSync.notifyGalleryUpdate(restaurant.id, "photo_updated", req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  // Delete photo (owner)
  app.delete("/api/my-restaurant/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const photo = await storage.getRestaurantPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || photo.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteRestaurantPhoto(req.params.id);
      realtimeSync.notifyGalleryUpdate(restaurant.id, "photo_deleted", req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ============ RESTAURANT SERVICES (OPENING HOURS) ============

  // Get services for a restaurant (public - for customers)
  app.get("/api/restaurants/:id/services", async (req, res) => {
    try {
      const services = await storage.getRestaurantServices(req.params.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Get services for current user's restaurant (owner)
  app.get("/api/my-restaurant/services", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const services = await storage.getRestaurantServices(restaurant.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Create service (owner)
  app.post("/api/my-restaurant/services", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const parsed = insertRestaurantServiceSchema.safeParse({ 
        ...req.body, 
        restaurantId: restaurant.id,
        name: req.body.name ? sanitizeString(req.body.name) : undefined,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid service data", details: parsed.error.errors });
      }

      const service = await storage.createRestaurantService(parsed.data);
      realtimeSync.notifySettingsUpdate(restaurant.id);
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  // Update service (owner)
  app.patch("/api/my-restaurant/services/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const service = await storage.getRestaurantService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || service.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updates: any = {};
      if (req.body.name !== undefined) updates.name = sanitizeString(req.body.name);
      if (req.body.startTime !== undefined) updates.startTime = req.body.startTime;
      if (req.body.endTime !== undefined) updates.endTime = req.body.endTime;
      if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;

      const updated = await storage.updateRestaurantService(req.params.id, updates);
      realtimeSync.notifySettingsUpdate(restaurant.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  // Delete service (owner)
  app.delete("/api/my-restaurant/services/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const service = await storage.getRestaurantService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const restaurant = await storage.getRestaurantByOwner(userId);
      if (!restaurant || service.restaurantId !== restaurant.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await storage.deleteRestaurantService(req.params.id);
      realtimeSync.notifySettingsUpdate(restaurant.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/health", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.HEALTH_API_KEY || process.env.APPTOORDER_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const verbose = req.query.verbose === "true";
    const SLOW_THRESHOLD_MS = 500;
    const startTime = Date.now();

    type CheckStatus = "ok" | "warning" | "error";
    interface HealthCheck {
      name: string;
      status: CheckStatus;
      responseTime?: number;
      details?: any;
      warnings?: string[];
    }

    const checks: HealthCheck[] = [];

    function timedCheck(name: string, fn: () => Promise<{ status: CheckStatus; details?: any; warnings?: string[] }>) {
      const t = Date.now();
      return fn()
        .then((result) => {
          const elapsed = Date.now() - t;
          const warnings = result.warnings || [];
          if (elapsed > SLOW_THRESHOLD_MS) warnings.push(`Slow response: ${elapsed}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`);
          checks.push({ name, status: warnings.length > 0 && result.status === "ok" ? "warning" : result.status, responseTime: elapsed, details: result.details, ...(warnings.length > 0 ? { warnings } : {}) });
        })
        .catch((err) => {
          checks.push({ name, status: "error", responseTime: Date.now() - t, details: { error: String(err) } });
        });
    }

    const dbChecks = [
      timedCheck("database:connection", async () => {
        const { pool } = await import("./db");
        const client = await pool.connect();
        try {
          const result = await client.query("SELECT NOW() as time, current_database() as db, pg_postmaster_start_time() as started");
          const row = result.rows[0];
          return { status: "ok", details: { serverTime: row.time, database: row.db, dbStarted: row.started } };
        } finally {
          client.release();
        }
      }),
      timedCheck("database:tables", async () => {
        const { pool } = await import("./db");
        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT table_name,
              (SELECT count(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name AND table_schema = 'public') as column_count
            FROM information_schema.tables as tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
          `);
          const tables: Record<string, number> = {};
          result.rows.forEach((r: any) => { tables[r.table_name] = parseInt(r.column_count); });
          const requiredTables = ["users", "restaurants", "categories", "dishes", "orders", "restaurant_photos", "restaurant_services", "sessions"];
          const missing = requiredTables.filter((t) => !(t in tables));
          const warnings: string[] = [];
          if (missing.length > 0) warnings.push(`Missing tables: ${missing.join(", ")}`);
          return { status: missing.length > 0 ? "error" : "ok", details: { tables, tableCount: Object.keys(tables).length }, warnings };
        } finally {
          client.release();
        }
      }),
      timedCheck("database:row_counts", async () => {
        const { pool } = await import("./db");
        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT 'users' as t, count(*) as c FROM users
            UNION ALL SELECT 'restaurants', count(*) FROM restaurants
            UNION ALL SELECT 'categories', count(*) FROM categories
            UNION ALL SELECT 'dishes', count(*) FROM dishes
            UNION ALL SELECT 'orders', count(*) FROM orders
            UNION ALL SELECT 'restaurant_photos', count(*) FROM restaurant_photos
            UNION ALL SELECT 'restaurant_services', count(*) FROM restaurant_services
            UNION ALL SELECT 'sessions', count(*) FROM sessions
          `);
          const counts: Record<string, number> = {};
          result.rows.forEach((r: any) => { counts[r.t] = parseInt(r.c); });
          const warnings: string[] = [];
          if (counts.users === 0) warnings.push("No users in database");
          if (counts.restaurants === 0) warnings.push("No restaurants in database");
          return { status: "ok", details: counts, warnings };
        } finally {
          client.release();
        }
      }),
      timedCheck("activity:last_order", async () => {
        const { pool: dbPool } = await import("./db");
        const client = await dbPool.connect();
        try {
          const result = await client.query(`SELECT o.created_at, o.restaurant_id, o.status, r.slug, r.name as restaurant_name FROM orders o LEFT JOIN restaurants r ON r.id = o.restaurant_id ORDER BY o.created_at DESC LIMIT 1`);
          if (result.rows.length === 0) {
            return { status: "warning", details: { lastOrder: null, hoursSinceLastOrder: null }, warnings: ["No orders have ever been placed"] };
          }
          const row = result.rows[0];
          const lastOrderTime = new Date(row.created_at);
          const hoursSince = Math.round((Date.now() - lastOrderTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
          const warnings: string[] = [];
          let activityStatus: CheckStatus = "ok";
          if (hoursSince > 72) { warnings.push(`No orders in ${Math.round(hoursSince)} hours — system may be inactive`); activityStatus = "error"; }
          else if (hoursSince > 24) { warnings.push(`Last order was ${Math.round(hoursSince)} hours ago`); activityStatus = "warning"; }
          return {
            status: activityStatus,
            details: { lastOrderAt: lastOrderTime.toISOString(), hoursSinceLastOrder: hoursSince, lastOrderStatus: row.status, lastOrderRestaurant: row.restaurant_name || "unknown" },
            ...(warnings.length > 0 ? { warnings } : {}),
          };
        } finally {
          client.release();
        }
      }),
    ];

    const appChecks = [
      timedCheck("auth:admin_user", async () => {
        const allUsers = await storage.getAllUsers();
        const admins = allUsers.filter((u) => u.role === "admin");
        if (admins.length === 0) return { status: "error", details: { error: "No admin user found in the system" } };
        return {
          status: "ok",
          details: {
            adminCount: admins.length,
            ...(verbose ? { admins: admins.map((a) => ({ id: a.id, email: a.email, hasPassword: !!(a as any).password })) } : {}),
          },
        };
      }),
      timedCheck("users:summary", async () => {
        const allUsers = await storage.getAllUsers();
        const byRole: Record<string, number> = {};
        allUsers.forEach((u) => { byRole[u.role || "unknown"] = (byRole[u.role || "unknown"] || 0) + 1; });
        const warnings: string[] = [];
        let orphanedOwnerCount = 0;
        const orphanedOwnerDetails: string[] = [];
        for (const u of allUsers.filter((u) => u.role === "restaurant_owner" || u.role === "owner")) {
          const r = await storage.getRestaurantByOwner(u.id);
          if (!r) {
            orphanedOwnerCount++;
            orphanedOwnerDetails.push(u.email || u.id);
          }
        }
        if (orphanedOwnerCount > 0) warnings.push(`${orphanedOwnerCount} owner(s) without a restaurant`);
        return {
          status: "ok",
          details: {
            totalUsers: allUsers.length,
            byRole,
            orphanedOwners: orphanedOwnerCount,
            ...(verbose ? { orphanedOwnerEmails: orphanedOwnerDetails } : {}),
          },
          warnings,
        };
      }),
      timedCheck("orders:global", async () => {
        const allOrders = await storage.getAllOrders();
        const byStatus: Record<string, number> = {};
        allOrders.forEach((o) => { byStatus[o.status || "unknown"] = (byStatus[o.status || "unknown"] || 0) + 1; });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = allOrders.filter((o) => o.createdAt ? new Date(o.createdAt) >= today : false);
        const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        return {
          status: "ok",
          details: { totalOrders: allOrders.length, todayOrders: todayOrders.length, totalRevenue: Math.round(totalRevenue * 100) / 100, byStatus },
        };
      }),
      timedCheck("websocket", async () => {
        const isRunning = realtimeSync && (realtimeSync as any).wss !== null;
        const clientCount = isRunning ? (realtimeSync as any).clients?.size || 0 : 0;
        return {
          status: isRunning ? "ok" : "error",
          details: { running: isRunning, connectedClients: clientCount, path: "/ws" },
        };
      }),
      timedCheck("object_storage", async () => {
        try {
          const oss = new ObjectStorageService();
          const paths = oss.getPublicObjectSearchPaths();
          const privateDir = oss.getPrivateObjectDir();
          return { status: "ok", details: { configured: true, publicPathCount: paths.length, hasPrivateDir: !!privateDir, ...(verbose ? { publicPaths: paths, privateDir } : {}) } };
        } catch (err) {
          return { status: "warning", details: { configured: false, error: String(err) }, warnings: ["Object storage not configured or inaccessible"] };
        }
      }),
      timedCheck("system:resources", async () => {
        const mem = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const warnings: string[] = [];
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);
        if (heapUsedMB / heapTotalMB > 0.9) warnings.push(`High heap usage: ${heapUsedMB}/${heapTotalMB} MB (${Math.round(heapUsedMB / heapTotalMB * 100)}%)`);
        if (rssMB > 512) warnings.push(`High RSS memory: ${rssMB} MB`);
        return {
          status: "ok",
          details: {
            memory: { heapUsedMB, heapTotalMB, rssMB, externalMB: Math.round(mem.external / 1024 / 1024) },
            cpu: { userMicroseconds: cpuUsage.user, systemMicroseconds: cpuUsage.system },
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
          },
          warnings,
        };
      }),
    ];

    const externalChecks = [
      timedCheck("payment:stripe", async () => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          return { status: "warning", details: { configured: false }, warnings: ["Stripe is not configured (STRIPE_SECRET_KEY missing)"] };
        }
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const resp = await fetch("https://api.stripe.com/v1/balance", {
            headers: { Authorization: `Bearer ${stripeKey}` },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const balance = await resp.json();
            return { status: "ok", details: { configured: true, connected: true, ...(verbose ? { available: balance.available, pending: balance.pending } : {}) } };
          }
          return { status: "error", details: { configured: true, connected: false, httpStatus: resp.status }, warnings: [`Stripe API returned HTTP ${resp.status}`] };
        } catch (err) {
          return { status: "error", details: { configured: true, connected: false, error: String(err) } };
        }
      }),
      timedCheck("email:smtp", async () => {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const configured = !!(smtpHost && smtpUser && smtpPass);
        if (!configured) {
          return { status: "warning", details: { configured: false, host: null }, warnings: ["Email/SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS missing)"] };
        }
        try {
          const net = await import("net");
          const port = parseInt(smtpPort || "587");
          const reachable = await new Promise<boolean>((resolve) => {
            const socket = net.createConnection({ host: smtpHost, port, timeout: 3000 });
            socket.on("connect", () => { socket.destroy(); resolve(true); });
            socket.on("error", () => { socket.destroy(); resolve(false); });
            socket.on("timeout", () => { socket.destroy(); resolve(false); });
          });
          return {
            status: reachable ? "ok" : "error",
            details: { configured: true, host: smtpHost, port, reachable },
            ...(reachable ? {} : { warnings: [`SMTP server ${smtpHost}:${port} is unreachable`] }),
          };
        } catch (err) {
          return { status: "error", details: { configured: true, error: String(err) } };
        }
      }),
      timedCheck("dns:macommande.shop", async () => {
        try {
          const dns = await import("dns");
          const { promisify } = await import("util");
          const resolve4 = promisify(dns.resolve4);
          const resolve6 = promisify(dns.resolve6);
          let ipv4: string[] = [];
          let ipv6: string[] = [];
          try { ipv4 = await resolve4("macommande.shop"); } catch {}
          try { ipv6 = await resolve6("macommande.shop"); } catch {}
          if (ipv4.length === 0 && ipv6.length === 0) {
            return { status: "error", details: { resolves: false }, warnings: ["macommande.shop does not resolve to any IP address"] };
          }
          return { status: "ok", details: { resolves: true, ipv4, ipv6 } };
        } catch (err) {
          return { status: "error", details: { error: String(err) } };
        }
      }),
      timedCheck("ssl:macommande.shop", async () => {
        try {
          const tls = await import("tls");
          const cert = await new Promise<{ valid: boolean; daysRemaining: number; subject: string; issuer: string; validFrom: string; validTo: string } | null>((resolve) => {
            const socket = tls.connect(443, "macommande.shop", { servername: "macommande.shop", timeout: 3000 }, () => {
              const peerCert = socket.getPeerCertificate();
              if (!peerCert || !peerCert.valid_to) { socket.destroy(); resolve(null); return; }
              const validTo = new Date(peerCert.valid_to);
              const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              resolve({
                valid: (socket as any).authorized !== false,
                daysRemaining,
                subject: peerCert.subject?.CN || "",
                issuer: peerCert.issuer?.O || "",
                validFrom: peerCert.valid_from,
                validTo: peerCert.valid_to,
              });
              socket.destroy();
            });
            socket.on("error", () => { resolve(null); });
            socket.on("timeout", () => { socket.destroy(); resolve(null); });
          });
          if (!cert) return { status: "error", details: { reachable: false }, warnings: ["Cannot establish TLS connection to macommande.shop:443"] };
          const warnings: string[] = [];
          if (!cert.valid) warnings.push("SSL certificate is not trusted or invalid");
          if (cert.daysRemaining < 14) warnings.push(`SSL certificate expires in ${cert.daysRemaining} days!`);
          else if (cert.daysRemaining < 30) warnings.push(`SSL certificate expires in ${cert.daysRemaining} days`);
          return {
            status: !cert.valid ? "error" : cert.daysRemaining < 7 ? "error" : cert.daysRemaining < 14 ? "warning" : "ok",
            details: { valid: cert.valid, daysRemaining: cert.daysRemaining, subject: cert.subject, issuer: cert.issuer, validFrom: cert.validFrom, validTo: cert.validTo },
            ...(warnings.length > 0 ? { warnings } : {}),
          };
        } catch (err) {
          return { status: "error", details: { error: String(err) } };
        }
      }),
    ];

    for (const check of [...dbChecks, ...appChecks, ...externalChecks]) {
      await check;
    }

    let allRestaurants: any[] = [];
    try {
      allRestaurants = await storage.getRestaurants();
    } catch {}

    await timedCheck("restaurants:list", async () => {
      const warnings: string[] = [];
      if (allRestaurants.length === 0) warnings.push("No restaurants configured");
      const slugs = allRestaurants.map((r) => r.slug);
      const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
      if (duplicates.length > 0) warnings.push(`Duplicate slugs: ${duplicates.join(", ")}`);
      const noOwner = allRestaurants.filter((r) => !r.ownerId).map((r) => r.slug);
      if (noOwner.length > 0) warnings.push(`Restaurants without owner: ${noOwner.join(", ")}`);
      return { status: "ok", details: { count: allRestaurants.length, slugs }, warnings };
    });

    for (const restaurant of allRestaurants) {
      await timedCheck(`restaurant:${restaurant.slug}`, async () => {
        const warnings: string[] = [];
        const [categories, dishes, photos, services, orders] = await Promise.all([
          storage.getCategories(restaurant.id),
          storage.getDishes(restaurant.id),
          storage.getRestaurantPhotos(restaurant.id),
          storage.getRestaurantServices(restaurant.id),
          storage.getOrders(restaurant.id),
        ]);
          let stats;
          try { stats = await storage.getRestaurantStats(restaurant.id); } catch { stats = null; }

          if (categories.length === 0) warnings.push("No categories defined");
          if (dishes.length === 0) warnings.push("No dishes defined — menu is empty");
          const unavailableDishes = dishes.filter((d) => !d.isAvailable);
          if (unavailableDishes.length === dishes.length && dishes.length > 0) warnings.push("All dishes are marked unavailable");
          if (!restaurant.isOpen) warnings.push("Restaurant is closed");
          if (!restaurant.contactName) warnings.push("No contact name set");
          if (!restaurant.contactPhone) warnings.push("No contact phone set");
          if (!restaurant.address) warnings.push("No address set");
          if (!restaurant.phone) warnings.push("No phone number set");
          if (services.length === 0) warnings.push("No opening hours configured");

          const ownerUser = restaurant.ownerId ? await storage.getUser(restaurant.ownerId) : null;
          if (!ownerUser) warnings.push("Owner user not found in database");

          const pendingOrders = orders.filter((o) => o.status === "pending");
          const recentOrders = orders.filter((o) => {
            if (!o.createdAt) return false;
            const d = new Date(o.createdAt);
            return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
          });

          return {
            status: "ok",
            details: {
              name: restaurant.name,
              slug: restaurant.slug,
              isOpen: restaurant.isOpen,
              hasContact: !!(restaurant.contactName && restaurant.contactPhone),
              hasAddress: !!restaurant.address,
              hasPhone: !!restaurant.phone,
              hasOwner: !!ownerUser,
              ownerRole: ownerUser?.role || null,
              categories: categories.length,
              dishes: { total: dishes.length, available: dishes.filter((d) => d.isAvailable).length, unavailable: unavailableDishes.length },
              photos: photos.length,
              services: services.length,
              orders: { total: orders.length, pending: pendingOrders.length, last24h: recentOrders.length },
              stats,
              urls: {
                public: `https://macommande.shop/${restaurant.slug}`,
                pro: `https://macommande.shop/pro/${restaurant.slug}`,
              },
              ...(verbose ? {
                id: restaurant.id,
                contactName: restaurant.contactName || null,
                contactPhone: restaurant.contactPhone || null,
                address: restaurant.address || null,
                phone: restaurant.phone || null,
                ownerEmail: ownerUser?.email || null,
                apiEndpoints: {
                  slug: `/api/restaurants/slug/${restaurant.slug}`,
                  categories: `/api/restaurants/${restaurant.id}/categories`,
                  dishes: `/api/restaurants/${restaurant.id}/dishes`,
                  photos: `/api/restaurants/${restaurant.id}/photos`,
                  services: `/api/restaurants/${restaurant.id}/services`,
                },
              } : {}),
            },
            warnings,
          };
      });
    }

    await timedCheck("domains:custom", async () => {
        const warnings: string[] = [];
        const domainRestaurants = allRestaurants.filter((r) => r.customDomain);
        if (domainRestaurants.length === 0) {
          return { status: "ok", details: { customDomains: 0 } };
        }
        const dns = await import("dns");
        const { promisify } = await import("util");
        const resolve4 = promisify(dns.resolve4);
        const resolve6 = promisify(dns.resolve6);
        const domainChecks: { domain: string; restaurant: string; resolves: boolean; ipv4?: string[]; ipv6?: string[] }[] = [];
        for (const r of domainRestaurants) {
          let ipv4: string[] = [];
          let ipv6: string[] = [];
          try { ipv4 = await resolve4(r.customDomain); } catch {}
          try { ipv6 = await resolve6(r.customDomain); } catch {}
          if (ipv4.length > 0 || ipv6.length > 0) {
            domainChecks.push({ domain: r.customDomain, restaurant: r.slug, resolves: true, ipv4, ipv6 });
          } else {
            domainChecks.push({ domain: r.customDomain, restaurant: r.slug, resolves: false });
            warnings.push(`Custom domain ${r.customDomain} for ${r.slug} does not resolve`);
          }
        }
        const failedCount = domainChecks.filter((d) => !d.resolves).length;
        return {
          status: failedCount > 0 ? "warning" : "ok",
          details: { customDomains: domainChecks.length, domains: domainChecks },
          ...(warnings.length > 0 ? { warnings } : {}),
        };
    });

    const errorCount = checks.filter((c) => c.status === "error").length;
    const warningCount = checks.filter((c) => c.status === "warning").length;
    const overallStatus = errorCount > 0 ? "critical" : warningCount > 0 ? "degraded" : "healthy";

    res.status(errorCount > 0 ? 503 : 200).json({
      status: overallStatus,
      summary: {
        total: checks.length,
        ok: checks.filter((c) => c.status === "ok").length,
        warnings: warningCount,
        errors: errorCount,
      },
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      uptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`,
      totalResponseTime: Date.now() - startTime,
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        port: process.env.PORT || 5000,
      },
      checks,
    });
  });

  app.post("/api/health/query", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.HEALTH_API_KEY || process.env.APPTOORDER_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const { sql: sqlQuery } = req.body;
    if (!sqlQuery || typeof sqlQuery !== "string") {
      return res.status(400).json({ error: "Missing 'sql' field in request body" });
    }

    const normalized = sqlQuery.trim().toLowerCase();
    const forbidden = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "create ", "grant ", "revoke ", "exec ", "execute ", "call "];
    const isMutating = forbidden.some((kw) => normalized.startsWith(kw) || normalized.includes(` ${kw.trim()} `));
    if (isMutating) {
      return res.status(403).json({ error: "Only read-only queries (SELECT, EXPLAIN, SHOW) are allowed" });
    }

    const startTime = Date.now();
    try {
      const { pool } = await import("./db");
      const client = await pool.connect();
      try {
        const result = await client.query(sqlQuery);
        res.json({
          success: true,
          query: sqlQuery,
          rowCount: result.rowCount,
          fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
          rows: result.rows,
          responseTime: Date.now() - startTime,
        });
      } finally {
        client.release();
      }
    } catch (err: any) {
      res.status(400).json({
        success: false,
        query: sqlQuery,
        error: err.message || String(err),
        responseTime: Date.now() - startTime,
      });
    }
  });

  app.get("/api/health/schema", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.HEALTH_API_KEY || process.env.APPTOORDER_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    try {
      const { pool } = await import("./db");
      const client = await pool.connect();
      try {
        const tablesResult = await client.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        const schema: Record<string, any> = {};
        for (const row of tablesResult.rows) {
          const tableName = row.table_name;
          const colsResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);

          const countResult = await client.query(`SELECT count(*) as c FROM "${tableName}"`);

          schema[tableName] = {
            rowCount: parseInt(countResult.rows[0].c),
            columns: colsResult.rows.map((c: any) => ({
              name: c.column_name,
              type: c.data_type,
              nullable: c.is_nullable === "YES",
              default: c.column_default,
              maxLength: c.character_maximum_length,
            })),
          };
        }

        res.json({ success: true, schema });
      } finally {
        client.release();
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  return httpServer;
}
