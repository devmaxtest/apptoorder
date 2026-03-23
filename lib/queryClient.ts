import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { coba } from "./cobaClient";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const t = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    const duration = Date.now() - t;
    
    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      coba.trackError(`API ${method} ${url}: ${res.status}`, { endpoint: url, status: res.status, duration });
      throw new Error(`${res.status}: ${text}`);
    }
    
    // Track slow requests
    if (duration > 3000) {
      coba.track('performance', { metric: `slow_api_${method}`, duration, endpoint: url });
    }
    
    return res;
  } catch (error) {
    coba.trackError(error as string | Error, { endpoint: url, method });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
