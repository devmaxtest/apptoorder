import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

const PRIVILEGED_ROLES = ["admin", "restaurant_owner", "owner"];

function isPrivilegedRole(role: string): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

async function upsertUser(claims: any, socialContext?: { role?: string; restaurantId?: string }) {
  const existingByEmail = claims["email"] ? await authStorage.getUserByEmail(claims["email"]) : null;
  const existingById = claims["sub"] ? await authStorage.getUserById(claims["sub"]) : null;
  
  if (existingByEmail && existingById && existingByEmail.id !== existingById.id) {
    console.warn(`Social login identity conflict: email ${claims["email"]} belongs to user ${existingByEmail.id} but OIDC sub ${claims["sub"]} belongs to user ${existingById.id}. Using email-matched account.`);
    const existingUser = existingByEmail;
    const updateData: any = {
      id: existingUser.id,
      email: existingUser.email || claims["email"],
      firstName: existingUser.firstName || claims["first_name"],
      lastName: existingUser.lastName || claims["last_name"],
      profileImageUrl: claims["profile_image_url"] || existingUser.profileImageUrl,
    };
    await authStorage.upsertUser(updateData);
    return existingUser;
  }
  
  const existingUser = existingByEmail || existingById;
  
  if (existingUser) {
    const updateData: any = {
      id: existingUser.id,
      email: existingUser.email || claims["email"],
      firstName: existingUser.firstName || claims["first_name"],
      lastName: existingUser.lastName || claims["last_name"],
      profileImageUrl: claims["profile_image_url"] || existingUser.profileImageUrl,
    };
    if (!isPrivilegedRole(existingUser.role) && socialContext?.role) {
      updateData.role = socialContext.role;
    }
    if (!isPrivilegedRole(existingUser.role) && socialContext?.restaurantId) {
      updateData.restaurantId = socialContext.restaurantId;
    }
    await authStorage.upsertUser(updateData);
    return existingUser;
  }

  const userData: any = {
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  };
  
  if (socialContext?.role) {
    userData.role = socialContext.role;
  }
  if (socialContext?.restaurantId) {
    userData.restaurantId = socialContext.restaurantId;
  }
  
  return await authStorage.upsertUser(userData);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local email/password strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await authStorage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          if (!user.password) {
            return done(null, false, { message: "Please use Replit login for this account" });
          }
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          // Create session user object similar to Replit Auth
          const sessionUser = {
            claims: { sub: user.id },
            expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
            isLocalAuth: true,
          };
          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = { _deferUpsert: true };
    updateUserSession(user, tokens);
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/social-login", (req, res) => {
    const { slug, context, returnTo } = req.query;
    
    const validContexts = ["customer", "pro", "admin"];
    const safeContext = validContexts.includes(context as string) ? context as string : "customer";
    
    let safeReturnTo = "/";
    if (typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      safeReturnTo = returnTo;
    }
    
    (req.session as any).socialLoginContext = {
      slug: typeof slug === "string" ? slug.replace(/[^a-z0-9-]/g, "") : null,
      context: safeContext,
      returnTo: safeReturnTo,
    };

    req.session.save(() => {
      res.redirect("/api/login");
    });
  });

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    ensureStrategy(req.hostname);
    
    const socialContext = (req.session as any).socialLoginContext;
    
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any, info: any) => {
      delete (req.session as any).socialLoginContext;
      
      if (err || !user) {
        const failRedirect = socialContext?.slug ? `/${socialContext.slug}` : "/";
        return res.redirect(failRedirect);
      }
      
      try {
        const claims = user.claims;
        const email = claims?.email;
        const oidcId = claims?.sub;
        
        const findExistingUser = async () => {
          const byEmail = email ? await authStorage.getUserByEmail(email) : null;
          if (byEmail) return byEmail;
          const byId = oidcId ? await authStorage.getUserById(oidcId) : null;
          return byId || null;
        };
        
        if (socialContext?.slug && socialContext.context === "customer") {
          const { storage } = await import("../../storage");
          const restaurant = await storage.getRestaurantBySlug(socialContext.slug);
          
          if (restaurant) {
            const existingUser = await findExistingUser();
            
            if (existingUser) {
              user.claims = { ...claims, sub: existingUser.id };
              if (existingUser.role === "customer" && !existingUser.restaurantId) {
                await authStorage.upsertUser({
                  id: existingUser.id,
                  email: existingUser.email!,
                  restaurantId: restaurant.id,
                  role: "customer",
                });
              }
            } else {
              const newUser = await upsertUser(claims, { role: "customer", restaurantId: restaurant.id });
              if (newUser) user.claims = { ...claims, sub: newUser.id };
            }
          } else {
            const existingUser = await findExistingUser();
            if (existingUser) {
              user.claims = { ...claims, sub: existingUser.id };
            } else {
              await upsertUser(claims);
            }
          }
        } else if (socialContext?.context === "pro") {
          const existingUser = await findExistingUser();
          if (existingUser) {
            user.claims = { ...claims, sub: existingUser.id };
          } else {
            const newUser = await upsertUser(claims, { role: "restaurant_owner" });
            if (newUser) user.claims = { ...claims, sub: newUser.id };
          }
        } else if (socialContext?.context === "admin") {
          const existingUser = await findExistingUser();
          if (existingUser && existingUser.role === "admin") {
            user.claims = { ...claims, sub: existingUser.id };
          } else if (existingUser) {
            user.claims = { ...claims, sub: existingUser.id };
          } else {
            await upsertUser(claims);
          }
        } else {
          const existingUser = await findExistingUser();
          if (existingUser) {
            user.claims = { ...claims, sub: existingUser.id };
          } else {
            await upsertUser(claims);
          }
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return res.redirect("/");
          }
          
          let redirectUrl = "/";
          if (socialContext?.slug && socialContext.context === "customer") {
            redirectUrl = `/${socialContext.slug}/client`;
          } else if (socialContext?.context === "pro") {
            redirectUrl = socialContext.returnTo || "/pro";
          } else if (socialContext?.context === "admin") {
            redirectUrl = socialContext.returnTo || "/";
          } else if (socialContext?.returnTo) {
            redirectUrl = socialContext.returnTo;
          }
          
          return res.redirect(redirectUrl);
        });
      } catch (error) {
        console.error("Social login callback error:", error);
        return res.redirect(socialContext?.slug ? `/${socialContext.slug}` : "/");
      }
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    const isLocalAuth = user?.isLocalAuth;
    
    req.logout(() => {
      if (isLocalAuth) {
        res.redirect("/");
      } else {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      }
    });
  });

  // POST logout for local auth users
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  // Email/password login endpoint
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        return res.json({ success: true, message: "Login successful" });
      });
    })(req, res, next);
  });

  // Email/password register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = "customer" } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await authStorage.createUserWithPassword({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role as string,
      });

      // Auto-login after registration
      const sessionUser = {
        claims: { sub: newUser.id },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        isLocalAuth: true,
      };

      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Registration successful but login failed" });
        }
        return res.json({ success: true, message: "Registration successful" });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!req.isAuthenticated() || !user) {
        return res.status(401).json({ error: "Non autorisé" });
      }

      const userId = user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Non autorisé" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe requis" });
      }

      // Validate new password format (8 chars, letters and numbers)
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères" });
      }

      if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit contenir des lettres et des chiffres" });
      }

      // Get user from database
      const dbUser = await authStorage.getUserById(userId);
      if (!dbUser || !dbUser.password) {
        return res.status(400).json({ error: "Utilisateur non trouvé ou pas de mot de passe défini" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Mot de passe actuel incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await authStorage.updateUserPassword(userId, hashedPassword);

      // Regenerate session to invalidate old session cookie
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("Session regeneration failed:", regenerateErr);
          return res.json({ success: true, message: "Mot de passe modifié avec succès" });
        }

        // Re-login with new session
        const sessionUser = {
          claims: { sub: userId },
          expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          isLocalAuth: true,
        };

        req.logIn(sessionUser, (loginErr) => {
          if (loginErr) {
            console.error("Re-login after password change failed:", loginErr);
          }
          return res.json({ success: true, message: "Mot de passe modifié avec succès" });
        });
      });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ error: "Échec du changement de mot de passe" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
