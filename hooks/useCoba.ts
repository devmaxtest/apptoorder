/**
 * Hook for querying MaxAI COBA API
 */
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const COBA_API_URL = import.meta.env.VITE_COBA_API_URL;
const COBA_API_KEY = import.meta.env.VITE_COBA_API_KEY;

async function fetchCobaData(endpoint: string) {
  if (!COBA_API_URL || !COBA_API_KEY) {
    throw new Error("COBA not configured");
  }

  const res = await fetch(`${COBA_API_URL}${endpoint}`, {
    headers: {
      "x-coba-key": COBA_API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`COBA API error: ${res.status}`);
  }

  return res.json();
}

export function useCobaStats(tenantId?: string) {
  return useQuery({
    queryKey: ["/coba/stats", tenantId],
    queryFn: () =>
      fetchCobaData(`/api/coba/stats${tenantId ? "/" + tenantId : ""}`),
    refetchInterval: 10000,
    enabled: !!COBA_API_URL && !!COBA_API_KEY,
  });
}

export function useCobaReports(tenantId?: string) {
  return useQuery({
    queryKey: ["/coba/reports", tenantId],
    queryFn: () =>
      fetchCobaData(`/api/coba/reports${tenantId ? "/" + tenantId : ""}`),
    refetchInterval: 30000,
    enabled: !!COBA_API_URL && !!COBA_API_KEY,
  });
}

export function useCobaEvents(tenantId?: string, type?: string) {
  return useQuery({
    queryKey: ["/coba/events", tenantId, type],
    queryFn: () => {
      let endpoint = "/api/coba/events";
      if (tenantId) endpoint += "/" + tenantId;
      if (type) endpoint += "?type=" + type;
      return fetchCobaData(endpoint);
    },
    refetchInterval: 15000,
    enabled: !!COBA_API_URL && !!COBA_API_KEY,
  });
}

export function useCobaAnalysis(tenantId?: string) {
  return useQuery({
    queryKey: ["/coba/analyze", tenantId],
    queryFn: () =>
      fetchCobaData(tenantId ? `/api/coba/analyze?tenantId=${tenantId}` : "/api/coba/analyze"),
    refetchInterval: 60000,
    enabled: !!COBA_API_URL && !!COBA_API_KEY,
  });
}
