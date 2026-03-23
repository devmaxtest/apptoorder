import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import { storage } from "./storage";

interface AuthenticatedClient {
  ws: WebSocket;
  userId?: string;
  role?: string;
  restaurantId?: string;
  ownedRestaurantId?: string;
  authenticated: boolean;
}

export type EventType = 
  | "new_order" 
  | "order_status_update" 
  | "menu_update" 
  | "settings_update" 
  | "gallery_update" 
  | "customers_update"
  | "restaurant_update"
  | "user_update"
  | "user_deleted";

class RealtimeSyncService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, AuthenticatedClient> = new Map();
  private sessionStore: any = null;

  initialize(server: Server, sessionStore?: any) {
    this.sessionStore = sessionStore || null;
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", async (ws, req) => {
      const clientId = Math.random().toString(36).substring(7);
      const client: AuthenticatedClient = { ws, authenticated: false };
      
      const userId = await this.extractUserId(req);
      if (userId) {
        client.userId = userId;
        client.authenticated = true;
        
        const user = await storage.getUser(userId);
        if (user) {
          client.role = user.role || undefined;
          
          if (user.role === "restaurant_owner") {
            const restaurant = await storage.getRestaurantByOwner(userId);
            if (restaurant) {
              client.ownedRestaurantId = restaurant.id;
            }
          }
        }
      }
      
      this.clients.set(clientId, client);

      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === "subscribe") {
            const currentClient = this.clients.get(clientId);
            if (currentClient) {
              const isAuthorized = this.authorizeSubscription(currentClient, data.restaurantId);
              if (isAuthorized) {
                currentClient.restaurantId = data.restaurantId;
                ws.send(JSON.stringify({ type: "subscribed", restaurantId: data.restaurantId }));
              } else {
                ws.send(JSON.stringify({ type: "error", message: "Unauthorized subscription" }));
              }
            }
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
      });

      ws.send(JSON.stringify({ type: "connected", clientId, authenticated: client.authenticated }));
    });
  }

  private async extractUserId(req: IncomingMessage): Promise<string | null> {
    if (!this.sessionStore) {
      return null;
    }

    try {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) return null;

      const sidMatch = cookieHeader.match(/connect\.sid=([^;]+)/);
      if (!sidMatch) return null;

      const rawCookie = decodeURIComponent(sidMatch[1]);
      const sessionMatch = rawCookie.match(/^s:([^.]+)/);
      if (!sessionMatch) return null;

      const sessionId = sessionMatch[1];
      
      return new Promise((resolve) => {
        this.sessionStore!.get(sessionId, (err: any, session: any) => {
          if (err || !session) {
            resolve(null);
            return;
          }
          
          const passport = (session as any).passport;
          if (passport?.user?.claims?.sub) {
            resolve(passport.user.claims.sub);
          } else {
            resolve(null);
          }
        });
      });
    } catch (e) {
      console.error("Session extraction error:", e);
      return null;
    }
  }

  private authorizeSubscription(client: AuthenticatedClient, restaurantId?: string): boolean {
    if (!restaurantId) {
      return false;
    }
    
    if (!client.authenticated) {
      return false;
    }
    
    if (client.role === "admin") {
      return true;
    }
    
    if (client.role === "restaurant_owner") {
      return client.ownedRestaurantId === restaurantId;
    }
    
    return false;
  }

  notifyNewOrder(restaurantId: string, order: any) {
    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      total: order.total,
      orderType: order.orderType,
      createdAt: order.createdAt,
    };
    
    this.broadcast(restaurantId, {
      type: "new_order",
      order: sanitizedOrder,
    }, true);
    
    if (order.customerId) {
      this.notifyCustomer(order.customerId, {
        type: "new_order",
        order: sanitizedOrder,
      });
    }
  }

  notifyOrderStatusUpdate(restaurantId: string, orderId: string, status: string, customerId?: string) {
    this.broadcast(restaurantId, {
      type: "order_status_update",
      orderId,
      status,
    }, true);

    if (customerId) {
      this.notifyCustomer(customerId, {
        type: "order_status_update",
        orderId,
        status,
      });
    }
  }

  notifyMenuUpdate(restaurantId: string, action: "category_created" | "category_updated" | "category_deleted" | "dish_created" | "dish_updated" | "dish_deleted", entityId?: string) {
    this.broadcast(restaurantId, {
      type: "menu_update",
      action,
      entityId,
    });
    this.broadcastToAdmin({
      type: "menu_update",
      restaurantId,
      action,
      entityId,
    });
  }

  notifySettingsUpdate(restaurantId: string) {
    this.broadcast(restaurantId, {
      type: "settings_update",
      restaurantId,
    });
    this.broadcastToAdmin({
      type: "settings_update",
      restaurantId,
    });
  }

  notifyGalleryUpdate(restaurantId: string, action: "photo_added" | "photo_updated" | "photo_deleted", photoId?: string) {
    this.broadcast(restaurantId, {
      type: "gallery_update",
      action,
      photoId,
    });
  }

  notifyCustomersUpdate(restaurantId: string) {
    this.broadcast(restaurantId, {
      type: "customers_update",
    }, true);
  }

  notifyRestaurantUpdate(restaurantId: string, action: "created" | "updated" | "deleted") {
    this.broadcast(restaurantId, {
      type: "restaurant_update",
      action,
    });
    this.broadcastToAdmin({
      type: "restaurant_update",
      restaurantId,
      action,
    });
  }

  notifyUserUpdate(userId: string, restaurantId?: string) {
    // Notify the user themselves
    this.notifyCustomer(userId, {
      type: "user_update",
      userId,
    });
    
    // If user belongs to a restaurant, notify the restaurant owner
    if (restaurantId) {
      this.broadcast(restaurantId, {
        type: "customers_update",
      }, true);
    }
    
    // Notify all admins
    this.broadcastToAdmin({
      type: "user_update",
      userId,
    });
  }

  notifyUserDeleted(userId: string, restaurantId?: string) {
    // If user belonged to a restaurant, notify the restaurant owner
    if (restaurantId) {
      this.broadcast(restaurantId, {
        type: "customers_update",
      }, true);
    }
    
    // Notify all admins
    this.broadcastToAdmin({
      type: "user_deleted",
      userId,
    });
  }

  private broadcast(restaurantId: string, message: any, ownersOnly: boolean = false) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.restaurantId === restaurantId && client.ws.readyState === WebSocket.OPEN) {
        if (ownersOnly) {
          if (client.role === "restaurant_owner" || client.role === "admin") {
            client.ws.send(messageStr);
          }
        } else {
          client.ws.send(messageStr);
        }
      }
    });
  }

  private broadcastToAdmin(message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.role === "admin" && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  private notifyCustomer(userId: string, message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }
}

export const realtimeSync = new RealtimeSyncService();
export const orderNotifications = realtimeSync;
