import {
    ShoppingCart, Receipt, Landmark, CreditCard, Users, BarChart3,
    Gauge
} from "lucide-react";

export interface Purchase {
    id: number; supplier: string; category: string; description?: string;
    amount: number; taxAmount?: number; invoiceNumber?: string; invoiceDate: string;
    dueDate?: string; isPaid: boolean; paymentMethod?: string;
}
export interface Expense {
    id: number; label: string; category: string; description?: string; amount: number;
    taxAmount?: number; invoiceNumber?: string; period: string; dueDate?: string; isPaid: boolean; paidDate?: string;
    paymentMethod?: string; isRecurring: boolean; frequency?: string; notes?: string;
}
export interface BankEntry {
    id: number; bankName: string; entryDate: string; label: string;
    amount: number; balance?: number; category?: string; isReconciled: boolean; notes?: string;
}
export interface Loan {
    id: number; loanLabel: string; bankName: string; loanType: string; totalAmount: number;
    remainingAmount: number; monthlyPayment: number; interestRate?: number;
    startDate: string; endDate?: string; notes?: string;
}
export interface CashEntry {
    id: number; entryDate: string; totalRevenue: number; cashAmount?: number;
    cbAmount?: number; cbzenAmount?: number; trAmount?: number; ctrAmount?: number;
    ubereatsAmount?: number; deliverooAmount?: number; chequeAmount?: number; virementAmount?: number;
    ticketRestoAmount?: number; onlineAmount?: number;
    coversCount?: number; averageTicket?: number; notes?: string;
}
export interface Employee {
    id: number; firstName: string; lastName: string; role: string;
    contractType: string; startDate: string; endDate?: string | null; monthlySalary: number | null;
    hourlyRate?: number | null; weeklyHours?: number | null; isActive: boolean;
    phone?: string | null; email?: string | null; socialSecurityNumber?: string | null; notes?: string | null;
}
export interface Payroll {
    id: number; employeeId: number; period: string; grossSalary: number;
    netSalary: number; socialCharges?: number; bonus?: number; overtime?: number;
    isPaid?: boolean; paidDate?: string | null; pdfPath?: string | null;
    employerCharges?: number | null; totalEmployerCost?: number | null;
}
export interface Absence {
    id: number; employeeId: number; type: string; startDate: string;
    endDate?: string; duration?: number; reason?: string; isApproved: boolean;
}
export interface AuditOverview {
    year: string; requestedYear?: string; availableYears?: string[];
    totalRevenue: number; totalCosts: number; operatingProfit: number;
    profitMargin: string; totalCovers: number; totalTVA10: number; totalTVA20: number; operatingDays: number;
    avgDailyRevenue: number; avgTicket: number; activeEmployees: number;
    costBreakdown: { achats: number; fraisGeneraux: number; salaires: number; chargesSociales: number; emprunts: number };
    monthlyRevenue: Record<string, number>; monthlyCosts?: Record<string, number>;
    unpaidPurchases: number; unpaidExpenses: number; totalRemainingLoans: number;
    totalBankDebits?: number; totalBankCredits?: number; bankEntriesCount?: number;
    purchasesCount?: number; expensesCount?: number;
    topSuppliers?: Array<{ name: string; total: number }>;
}
export interface SuguFile {
    id: number; filename: string; originalName: string; mimeType: string;
    size: number; category: string; subcategory?: string; tags?: string[];
    description?: string; linkedEntityType?: string; linkedEntityId?: number;
    uploadedAt: string; url?: string; thumbnailUrl?: string;
}
export interface SuguBackup {
    id: number; filename: string; size: number; createdAt: string; type: string;
    label?: string; status?: string;
}
export interface SuguTrashItem {
    id: number; originalName: string; deletedAt: string; expiresAt: string;
    category: string; size: number;
}

export const FILE_CATEGORIES = ["facture", "bon_livraison", "bulletin_paie", "contrat", "attestation", "releve_bancaire", "devis", "ticket", "photo", "autre"];

export function fmtFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
}

export interface Supplier {
    id: number; name: string; shortName?: string; siret?: string; tvaNumber?: string;
    accountNumber?: string; address?: string; city?: string; postalCode?: string;
    phone?: string; email?: string; website?: string; contactName?: string;
    category?: string; paymentTerms?: string; defaultPaymentMethod?: string;
    bankIban?: string; bankBic?: string; notes?: string;
    totalPurchases?: number; totalExpenses?: number; invoiceCount?: number;
    lastInvoiceDate?: string; isActive: boolean; createdAt?: string;
}

export const TABS = [
    { id: "dashboard", label: "Dashboard", icon: Gauge },
    { id: "achats", label: "Achats", icon: ShoppingCart },
    { id: "frais", label: "Frais Généraux", icon: Receipt },
    { id: "banque", label: "Banque", icon: Landmark },
    { id: "caisse", label: "Journal de Caisse", icon: CreditCard },
    { id: "rh", label: "Gestion RH", icon: Users },
];

export const PURCHASE_CATEGORIES = ["alimentaire", "assurances", "boissons", "comptabilite", "eau", "emballages", "energie", "entretien", "materiels", "plateformes", "telecom", "travaux", "vehicules", "autre"];
export const EXPENSE_CATEGORIES = ["alimentaire", "assurances", "boissons", "comptabilite", "eau", "emballages", "energie", "entretien", "materiels", "plateformes", "telecom", "travaux", "vehicules", "autre"];
export const CONTRACT_TYPES = ["CDI", "CDD", "Extra", "Stage"];
export const ABSENCE_TYPES = ["conge", "maladie", "retard", "absence", "formation"];
export const PAYMENT_METHODS = ["virement", "cheque", "carte", "especes", "prelevement"];

export function fmt(n: number | null | undefined) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n ?? 0);
}
export function fmtEur(n: number | null | undefined) {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n ?? 0)) + " €";
}
export function fmtEurSigned(n: number | null | undefined) {
    const val = n ?? 0;
    const abs = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val));
    if (val > 0) return `+${abs} €`;
    if (val < 0) return `-${abs} €`;
    return `${abs} €`;
}
export function safeFloat(v: string): number {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}
export function safeInt(v: string): number {
    const n = parseInt(v);
    return isNaN(n) ? 0 : n;
}
export const MOIS_COURT = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
export function fmtDate(d: string) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("fr-FR");
}
export function fmtDateShort(d: string) {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}-${MOIS_COURT[dt.getMonth()]}`;
}
export function catLabel(cat: string) {
    return cat.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
}
export function bankOpType(cat?: string | null): string {
    if (!cat) return "";
    if (["virement_emis", "virement_recu", "encaissement_virement", "virement_interne", "loyer", "salaire", "achat_fournisseur", "credit_divers"].includes(cat)) return "Virement";
    if (["frais_bancaires", "prelevement", "assurance", "charges_sociales", "telecom", "energie", "emprunt", "leasing"].includes(cat)) return "Prél";
    if (["encaissement_cb", "plateforme"].includes(cat)) return "CB";
    if (["carburant", "vehicule", "equipement"].includes(cat)) return "Prél";
    return "Divers";
}

export function normalizeCatKey(c: string): string {
    const k = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (["electricite", "energie", "energy"].includes(k)) return "energie";
    if (["eau", "water", "eau potable"].includes(k)) return "eau";
    if (["telecom", "telecommunications"].includes(k)) return "telecom";
    if (["fournitures", "equipement", "materiel", "materiels"].includes(k)) return "materiels";
    if (["plateforme", "plateformes"].includes(k)) return "plateformes";
    if (["assurance", "assurances"].includes(k)) return "assurances";
    if (["vehicule", "vehicules"].includes(k)) return "vehicules";
    if (["produits_entretien"].includes(k)) return "entretien";
    if (["travaux", "renovation", "reparation", "reparations", "chantier", "btp"].includes(k)) return "travaux";
    return k;
}
