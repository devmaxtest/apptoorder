import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface RealtimeSyncOptions {
  restaurantId?: string;
  userId?: string;
  role?: "admin" | "owner" | "customer";
  enabled?: boolean;
}

export function useOrderSync({ restaurantId, userId, role, enabled = true }: RealtimeSyncOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "subscribe",
            restaurantId,
            userId,
            role,
          }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case "new_order":
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
              break;
              
            case "order_status_update":
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
              break;
              
            case "menu_update":
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/categories"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/dishes"] });
              if (data.restaurantId) {
                queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${data.restaurantId}/categories`] });
                queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${data.restaurantId}/dishes`] });
              }
              break;
              
            case "settings_update":
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
              queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
              if (data.restaurantId) {
                queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${data.restaurantId}`] });
                queryClient.invalidateQueries({ queryKey: [`/api/restaurants/slug`] });
              }
              break;
              
            case "gallery_update":
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/photos"] });
              break;
              
            case "customers_update":
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] });
              break;
              
            case "restaurant_update":
              queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
              if (data.restaurantId) {
                queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${data.restaurantId}`] });
              }
              break;
              
            case "user_update":
              // Refresh user data across all portals
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] });
              break;
              
            case "user_deleted":
              // Refresh user lists after deletion
              queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] });
              break;
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };
      
      wsRef.current.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };
      
      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };
    } catch (e) {
      console.error("WebSocket connection error:", e);
    }
  }, [enabled, restaurantId, userId, role]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}

export function useVisibilityRefresh(queryKeys: string[][]) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queryKeys]);
}
