import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { orderNotifications } from "./websocket";
import { initializeDatabase } from "./init-db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security middleware - Helmet for secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - Protect against brute force and DDoS attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use("/api", apiLimiter);

// Stricter rate limit for order creation to prevent spam
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 orders per minute per IP
  message: { error: "Too many orders, please try again later" },
});
// Only apply to POST requests for order creation
app.post("/api/orders", orderLimiter);

app.use((req, res, next) => {
  if (req.path === "/api/uploads/proxy") {
    return next();
  }
  express.json({
    limit: "10kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === "/api/uploads/proxy") {
    return next();
  }
  express.urlencoded({ extended: false, limit: "10kb" })(req, res, next);
});

app.use(async (req, res, next) => {
  const host = (req.hostname || req.headers.host || "").replace(/:\d+$/, "").toLowerCase();
  if (
    host &&
    !host.includes("localhost") &&
    !host.includes("replit") &&
    !host.includes("macommande.shop") &&
    !host.includes("127.0.0.1")
  ) {
    try {
      const { storage } = await import("./storage");
      const restaurant = await storage.getRestaurantByCustomDomain(host)
        || await storage.getRestaurantBySlug(host.split('.')[0]);
      if (restaurant) {
        if (req.path === "/" || req.path === "") {
          return res.redirect(301, `/${restaurant.slug}`);
        }
      }
    } catch (e) {}
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      const sensitiveRoutes = ["/api/admin/login", "/api/admin/verify-2fa", "/api/auth"];
      if (capturedJsonResponse && !sensitiveRoutes.some(r => path.startsWith(r))) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await initializeDatabase();
  orderNotifications.initialize(httpServer);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
