import type { RequestHandler, Request } from "express";
import { storage } from "../storage";

export type UserRole = "admin" | "restaurant_owner" | "customer";

export function getUserId(req: Request): string | undefined {
  return (req.user as any)?.claims?.sub;
}

export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return async (req, res, next) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (!allowedRoles.includes(user.role as UserRole)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      (req as any).userRole = user.role;
      (req as any).dbUser = user;
      next();
    } catch (error) {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
};

export const requireAdmin: RequestHandler = requireRole("admin");
export const requireRestaurantOwner: RequestHandler = requireRole("restaurant_owner", "admin");
export const requireCustomer: RequestHandler = requireRole("customer", "restaurant_owner", "admin");
