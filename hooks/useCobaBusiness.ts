import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

const COBA_API_URL = import.meta.env.VITE_COBA_API_URL;
const COBA_API_KEY = import.meta.env.VITE_COBA_API_KEY;

async function cobaFetch(endpoint: string, options?: RequestInit) {
  if (!COBA_API_URL || !COBA_API_KEY) {
    throw new Error("COBA not configured");
  }
  const res = await fetch(`${COBA_API_URL}/api/coba/business${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-coba-key": COBA_API_KEY,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`COBA ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json;
}

async function cobaFetchData(endpoint: string, options?: RequestInit) {
  const json = await cobaFetch(endpoint, options);
  return json.data ?? json;
}

export const isCobaConfigured = !!COBA_API_URL && !!COBA_API_KEY;

export function useSynthesis(tenantId: string, year?: number) {
  return useQuery({
    queryKey: ["/coba/business/synthesis", tenantId, year],
    queryFn: () => cobaFetchData(`/synthesis/${tenantId}${year ? `?year=${year}` : ""}`),
    enabled: isCobaConfigured && !!tenantId,
    refetchInterval: 30000,
  });
}

export function useAuditOverview(tenantId: string, year?: string) {
  return useQuery({
    queryKey: ["/coba/business/audit/overview", tenantId, year],
    queryFn: () => cobaFetchData(`/audit/${tenantId}/overview${year ? `?year=${year}` : ""}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function usePurchases(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/purchases", tenantId],
    queryFn: () => cobaFetchData(`/purchases/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreatePurchase(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/purchases/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/purchases", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/audit/overview", tenantId] });
    },
  });
}

export function useUpdatePurchase(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/purchases/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/purchases", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useDeletePurchase(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/purchases/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/purchases", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useExpenses(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/expenses", tenantId],
    queryFn: () => cobaFetchData(`/expenses/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateExpense(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/expenses/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/expenses", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useUpdateExpense(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/expenses/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/expenses", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useDeleteExpense(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/expenses/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/expenses", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useBankMovements(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/bank", tenantId],
    queryFn: () => cobaFetchData(`/bank/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateBankMovement(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/bank/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/bank", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useUpdateBankMovement(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/bank/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/bank", tenantId] });
    },
  });
}

export function useDeleteBankMovement(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/bank/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/bank", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useLoans(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/loans", tenantId],
    queryFn: () => cobaFetchData(`/loans/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateLoan(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/loans/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/loans", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useUpdateLoan(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/loans/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/loans", tenantId] });
    },
  });
}

export function useDeleteLoan(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/loans/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/loans", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useCashEntries(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/cash", tenantId],
    queryFn: () => cobaFetchData(`/cash/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCashSummary(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/cash/summary", tenantId],
    queryFn: () => cobaFetchData(`/cash/${tenantId}/summary`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateCashEntry(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/cash/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/cash", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/cash/summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useUpdateCashEntry(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/cash/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/cash", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/cash/summary", tenantId] });
    },
  });
}

export function useDeleteCashEntry(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/cash/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/cash", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/cash/summary", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useEmployees(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/employees", tenantId],
    queryFn: () => cobaFetchData(`/employees/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateEmployee(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/employees/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/employees", tenantId] });
    },
  });
}

export function useUpdateEmployee(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/employees/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/employees", tenantId] });
    },
  });
}

export function useDeleteEmployee(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/employees/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/employees", tenantId] });
    },
  });
}

export function usePayroll(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/payroll", tenantId],
    queryFn: () => cobaFetchData(`/payroll/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreatePayroll(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/payroll/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/payroll", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useDeletePayroll(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/payroll/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/payroll", tenantId] });
    },
  });
}

export function useAbsences(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/absences", tenantId],
    queryFn: () => cobaFetchData(`/absences/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateAbsence(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/absences/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/absences", tenantId] });
    },
  });
}

export function useDeleteAbsence(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/absences/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/absences", tenantId] });
    },
  });
}

export function useSuppliers(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/suppliers", tenantId],
    queryFn: () => cobaFetchData(`/suppliers/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateSupplier(tenantId: string) {
  return useMutation({
    mutationFn: (data: any) => cobaFetchData(`/suppliers/${tenantId}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/suppliers", tenantId] });
    },
  });
}

export function useUpdateSupplier(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/suppliers/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/suppliers", tenantId] });
    },
  });
}

export function useDeleteSupplier(tenantId: string) {
  return useMutation({
    mutationFn: (id: number) => cobaFetch(`/suppliers/${tenantId}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/suppliers", tenantId] });
    },
  });
}

export function useFiles(tenantId: string, linkedEntityType?: string, linkedEntityId?: number) {
  const params = new URLSearchParams();
  if (linkedEntityType) params.set("linkedEntityType", linkedEntityType);
  if (linkedEntityId) params.set("linkedEntityId", String(linkedEntityId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["/coba/business/files", tenantId, linkedEntityType, linkedEntityId],
    queryFn: () => cobaFetchData(`/files/${tenantId}${qs}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useUploadFile(tenantId: string) {
  return useMutation({
    mutationFn: (formData: FormData) => {
      if (!COBA_API_URL || !COBA_API_KEY) throw new Error("COBA not configured");
      return fetch(`${COBA_API_URL}/api/coba/business/files/${tenantId}/upload`, {
        method: "POST",
        headers: { "x-coba-key": COBA_API_KEY },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const json = await res.json();
        return json.data ?? json;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/files", tenantId] });
    },
  });
}

export function useDeleteFile(tenantId: string) {
  return useMutation({
    mutationFn: (fileId: number) => cobaFetch(`/files/${tenantId}/${fileId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/files", tenantId] });
    },
  });
}

export function useSendFileEmail(tenantId: string) {
  return useMutation({
    mutationFn: (data: { fileId: number; to: string; subject: string; body: string }) =>
      cobaFetchData(`/files/${tenantId}/send-email`, { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useFileStats(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/files/stats", tenantId],
    queryFn: () => cobaFetchData(`/files/${tenantId}/stats`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useBackups(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/backups", tenantId],
    queryFn: () => cobaFetchData(`/backups/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useCreateBackup(tenantId: string) {
  return useMutation({
    mutationFn: () => cobaFetchData(`/backups/${tenantId}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/backups", tenantId] });
    },
  });
}

export function useTrashItems(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/trash", tenantId],
    queryFn: () => cobaFetchData(`/trash/${tenantId}`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useRestoreTrashItem(tenantId: string) {
  return useMutation({
    mutationFn: (itemId: number) => cobaFetchData(`/trash/${tenantId}/${itemId}/restore`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/trash", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/files", tenantId] });
    },
  });
}

export function useEmptyTrash(tenantId: string) {
  return useMutation({
    mutationFn: () => cobaFetch(`/trash/${tenantId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/trash", tenantId] });
    },
  });
}

export function useImportBankStatement(tenantId: string) {
  return useMutation({
    mutationFn: (formData: FormData) => {
      if (!COBA_API_URL || !COBA_API_KEY) throw new Error("COBA not configured");
      return fetch(`${COBA_API_URL}/api/coba/business/bank/${tenantId}/import`, {
        method: "POST",
        headers: { "x-coba-key": COBA_API_KEY },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Import failed: ${res.status}`);
        const json = await res.json();
        return json.data ?? json;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/bank", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useImportPayrollPdf(tenantId: string) {
  return useMutation({
    mutationFn: (formData: FormData) => {
      if (!COBA_API_URL || !COBA_API_KEY) throw new Error("COBA not configured");
      return fetch(`${COBA_API_URL}/api/coba/business/payroll/${tenantId}/import-pdf`, {
        method: "POST",
        headers: { "x-coba-key": COBA_API_KEY },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Import failed: ${res.status}`);
        const json = await res.json();
        return json.data ?? json;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/payroll", tenantId] });
    },
  });
}

export function usePayrollImportStatus(tenantId: string, importId: string | null) {
  return useQuery({
    queryKey: ["/coba/business/payroll/import-status", tenantId, importId],
    queryFn: () => cobaFetchData(`/payroll/${tenantId}/import-status/${importId}`),
    enabled: isCobaConfigured && !!tenantId && !!importId,
    refetchInterval: 3000,
  });
}

export function useReparsePayroll(tenantId: string) {
  return useMutation({
    mutationFn: () => cobaFetchData(`/payroll/${tenantId}/reparse-all`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/payroll", tenantId] });
    },
  });
}

export function useRapprochement(tenantId: string) {
  return useQuery({
    queryKey: ["/coba/business/rapprochement", tenantId],
    queryFn: () => cobaFetchData(`/bank/${tenantId}/rapprochement`),
    enabled: isCobaConfigured && !!tenantId,
  });
}

export function useMatchRapprochement(tenantId: string) {
  return useMutation({
    mutationFn: (data: { bankEntryId: number; matchType: string; matchId: number }) =>
      cobaFetchData(`/bank/${tenantId}/rapprochement/match`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/rapprochement", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/bank", tenantId] });
    },
  });
}

export function useScanTicket(tenantId: string) {
  return useMutation({
    mutationFn: (formData: FormData) => {
      if (!COBA_API_URL || !COBA_API_KEY) throw new Error("COBA not configured");
      return fetch(`${COBA_API_URL}/api/coba/business/cash/${tenantId}/scan-ticket`, {
        method: "POST",
        headers: { "x-coba-key": COBA_API_KEY },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
        const json = await res.json();
        return json.data ?? json;
      });
    },
  });
}

export function useUpdatePayroll(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/payroll/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/payroll", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/coba/business/synthesis", tenantId] });
    },
  });
}

export function useUpdateAbsence(tenantId: string) {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => cobaFetchData(`/absences/${tenantId}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/coba/business/absences", tenantId] });
    },
  });
}
