import type { Express, Request, Response, NextFunction } from "express";
import { HubRiseService } from "./hubrise";
import type { HubRiseCallback, HubRiseOrder } from "./types";
import crypto from "crypto";
import { db } from "../../db";
import { restaurants } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const oauthStateStore: Map<string, { restaurantId: string; userId: string; timestamp: number }> = new Map();

function isAuthenticatedMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user?.claims?.sub) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function getUserId(req: Request): string | undefined {
  return (req as any).user?.claims?.sub;
}

function getBaseHubRiseService(): HubRiseService {
  const clientId = process.env.HUBRISE_CLIENT_ID;
  const clientSecret = process.env.HUBRISE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "HubRise non configuré. Définissez HUBRISE_CLIENT_ID et HUBRISE_CLIENT_SECRET."
    );
  }

  return new HubRiseService({ clientId, clientSecret });
}

function getHubRiseServiceForRestaurant(restaurant: { hubriseAccessToken: string | null; hubriseLocationId: string | null; hubriseCatalogId: string | null }): HubRiseService {
  const clientId = process.env.HUBRISE_CLIENT_ID;
  const clientSecret = process.env.HUBRISE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("HubRise non configuré.");
  }

  return new HubRiseService({
    clientId,
    clientSecret,
    accessToken: restaurant.hubriseAccessToken || undefined,
    locationId: restaurant.hubriseLocationId || undefined,
    catalogId: restaurant.hubriseCatalogId || undefined,
  });
}

export function registerHubRiseRoutes(app: Express): void {
  app.get("/api/hubrise/oauth/authorize", isAuthenticatedMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const restaurantId = req.query.restaurantId as string;
      if (!restaurantId) {
        return res.status(400).json({ error: "restaurantId is required" });
      }

      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      if (restaurant.ownerId !== userId) {
        const user = (req as any).user;
        if (!user?.isMasterAdmin) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }

      const service = getBaseHubRiseService();
      const redirectUri = `${req.protocol}://${req.get("host")}/api/hubrise/oauth/callback`;
      const scope = (req.query.scope as string) || "location[orders.write,catalog.read]";
      
      const state = crypto.randomBytes(32).toString("hex");
      oauthStateStore.set(state, { restaurantId, userId, timestamp: Date.now() });
      
      setTimeout(() => oauthStateStore.delete(state), 10 * 60 * 1000);
      
      const authUrl = service.getOAuthURL(redirectUri, scope, state);
      res.json({ authUrl });
    } catch (error) {
      console.error("HubRise OAuth error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate OAuth URL" 
      });
    }
  });

  app.get("/api/hubrise/oauth/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || typeof code !== "string") {
        return res.status(400).send(renderErrorPage("Code d'autorisation manquant"));
      }
      
      if (!state || typeof state !== "string") {
        return res.status(400).send(renderErrorPage("Paramètre state manquant"));
      }
      
      const storedState = oauthStateStore.get(state);
      if (!storedState) {
        return res.status(400).send(renderErrorPage("State invalide ou expiré. Veuillez réessayer."));
      }
      
      oauthStateStore.delete(state);
      
      const service = getBaseHubRiseService();
      const redirectUri = `${req.protocol}://${req.get("host")}/api/hubrise/oauth/callback`;
      const tokenData = await service.exchangeCodeForToken(code, redirectUri);

      await db.update(restaurants)
        .set({
          hubriseAccessToken: tokenData.access_token,
          hubriseRefreshToken: tokenData.refresh_token || null,
          hubriseLocationId: tokenData.location_id || null,
          hubriseCatalogId: tokenData.catalog_id || null,
          hubriseCustomerListId: tokenData.customer_list_id || null,
          hubriseConnected: true,
        })
        .where(eq(restaurants.id, storedState.restaurantId));

      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>HubRise Connecté</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center; background: #f5f5f5;">
            <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #22c55e;">✅ HubRise Connecté !</h1>
              <p>Votre restaurant est maintenant connecté à HubRise.</p>
              <p><strong>Location :</strong> ${tokenData.location_id || "Non spécifié"}</p>
              <p style="color: #666; font-size: 14px;">Les commandes seront automatiquement envoyées à votre logiciel de caisse.</p>
              <script>
                setTimeout(() => { window.close(); }, 3000);
              </script>
              <a href="/pro" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 6px;">Retour au tableau de bord</a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("HubRise OAuth callback error:", error);
      res.status(500).send(renderErrorPage(error instanceof Error ? error.message : "Erreur inconnue"));
    }
  });

  app.get("/api/hubrise/status/:restaurantId", isAuthenticatedMiddleware, async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params;
      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const userId = getUserId(req);
      if (restaurant.ownerId !== userId) {
        const user = (req as any).user;
        if (!user?.isMasterAdmin) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      
      res.json({
        configured: !!(process.env.HUBRISE_CLIENT_ID && process.env.HUBRISE_CLIENT_SECRET),
        connected: !!restaurant.hubriseConnected,
        locationId: restaurant.hubriseLocationId,
        catalogId: restaurant.hubriseCatalogId,
        customerListId: restaurant.hubriseCustomerListId,
      });
    } catch (error) {
      res.json({
        configured: false,
        connected: false,
        error: error instanceof Error ? error.message : "HubRise non configuré",
      });
    }
  });

  app.post("/api/hubrise/disconnect/:restaurantId", isAuthenticatedMiddleware, async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params;
      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const userId = getUserId(req);
      if (restaurant.ownerId !== userId) {
        const user = (req as any).user;
        if (!user?.isMasterAdmin) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }

      await db.update(restaurants)
        .set({
          hubriseAccessToken: null,
          hubriseRefreshToken: null,
          hubriseLocationId: null,
          hubriseCatalogId: null,
          hubriseCustomerListId: null,
          hubriseConnected: false,
        })
        .where(eq(restaurants.id, restaurantId));

      res.json({ success: true, message: "HubRise déconnecté" });
    } catch (error) {
      console.error("HubRise disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect HubRise" });
    }
  });

  app.post("/api/hubrise/orders/:restaurantId", isAuthenticatedMiddleware, async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params;
      const userId = getUserId(req);
      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
      
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      if (restaurant.ownerId !== userId && !(req as any).user?.isMasterAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (!restaurant.hubriseConnected || !restaurant.hubriseAccessToken) {
        return res.status(400).json({ error: "HubRise non connecté pour ce restaurant" });
      }

      const service = getHubRiseServiceForRestaurant(restaurant);
      const order = req.body as HubRiseOrder;
      const result = await service.createOrder(order);
      res.json(result);
    } catch (error) {
      console.error("HubRise create order error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create order" });
    }
  });

  app.get("/api/hubrise/orders/:restaurantId", isAuthenticatedMiddleware, async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params;
      const userId = getUserId(req);
      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
      
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      if (restaurant.ownerId !== userId && !(req as any).user?.isMasterAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (!restaurant.hubriseConnected || !restaurant.hubriseAccessToken) {
        return res.status(400).json({ error: "HubRise non connecté" });
      }

      const service = getHubRiseServiceForRestaurant(restaurant);
      const { status, after } = req.query;
      const orders = await service.getOrders(status as string | undefined, after as string | undefined);
      res.json(orders);
    } catch (error) {
      console.error("HubRise get orders error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get orders" });
    }
  });

  app.get("/api/hubrise/catalog/:restaurantId", isAuthenticatedMiddleware, async (req: Request, res: Response) => {
    try {
      const { restaurantId } = req.params;
      const userId = getUserId(req);
      const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
      
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      if (restaurant.ownerId !== userId && !(req as any).user?.isMasterAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (!restaurant.hubriseConnected || !restaurant.hubriseAccessToken) {
        return res.status(400).json({ error: "HubRise non connecté" });
      }

      const service = getHubRiseServiceForRestaurant(restaurant);
      const catalog = await service.getCatalog(req.query.catalogId as string | undefined);
      res.json(catalog);
    } catch (error) {
      console.error("HubRise get catalog error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get catalog" });
    }
  });

  app.post("/api/hubrise/callback", async (req: Request, res: Response) => {
    try {
      const callback = req.body as HubRiseCallback;
      console.log("HubRise callback received:", JSON.stringify(callback, null, 2));
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("HubRise callback error:", error);
      res.status(500).json({ error: "Failed to process callback" });
    }
  });
}

export async function pushOrderToHubRise(restaurantId: string, order: {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  orderType: string;
  total: number;
  items: string;
}): Promise<boolean> {
  try {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    
    if (!restaurant || !restaurant.hubriseConnected || !restaurant.hubriseAccessToken) {
      return false;
    }

    const service = getHubRiseServiceForRestaurant(restaurant);
    
    let parsedItems: Array<{ name: string; price: number; quantity: number }> = [];
    try {
      parsedItems = JSON.parse(order.items);
    } catch {
      return false;
    }

    const hubriseOrder: HubRiseOrder = {
      status: "new",
      private_ref: order.id,
      service_type: order.orderType === "delivery" ? "delivery" : "collection",
      items: parsedItems.map(item => ({
        product_name: item.name,
        price: (item.price * 100).toFixed(0),
        quantity: item.quantity,
      })),
      total: (order.total * 100).toFixed(0),
      customer_notes: order.customerAddress ? `Adresse: ${order.customerAddress}` : undefined,
    };

    await service.createOrder(hubriseOrder);
    console.log(`[HubRise] Order ${order.id} pushed successfully for restaurant ${restaurantId}`);
    return true;
  } catch (error) {
    console.error(`[HubRise] Failed to push order ${order.id}:`, error);
    return false;
  }
}

function renderErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><title>Connexion HubRise échouée</title></head>
      <body style="font-family: system-ui; padding: 40px; text-align: center; background: #f5f5f5;">
        <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #ef4444;">Connexion échouée</h1>
          <p>${message}</p>
          <a href="/pro" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 6px;">Retour au tableau de bord</a>
        </div>
      </body>
    </html>
  `;
}
