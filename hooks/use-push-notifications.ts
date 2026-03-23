import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(restaurantId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);

    if (supported) {
      navigator.serviceWorker.register("/sw.js").then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }).catch((err) => {
        console.error("[Push] Service worker registration failed:", err);
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || isLoading) return false;
    setIsLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        restaurantId: restaurantId || null,
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isLoading, restaurantId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || isLoading) return false;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await apiRequest("POST", "/api/push/unsubscribe", {
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isLoading]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
