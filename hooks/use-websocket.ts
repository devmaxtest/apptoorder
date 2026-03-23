import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useOrderNotifications(restaurantId?: string, userId?: string, role?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isEnabled = !!(restaurantId || userId);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: "subscribe",
            restaurantId,
            userId,
            role,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            
            if (data.type === "new_order") {
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/stats"] });
            }
            
            if (data.type === "order_status_update") {
              queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] });
            }
          } catch (e) {
            console.error("WebSocket message parse error:", e);
          }
        };

        ws.onclose = () => {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };

        wsRef.current = ws;
      } catch (e) {
        console.error("WebSocket connection error:", e);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [restaurantId, userId, role, isEnabled]);

  return wsRef.current;
}
