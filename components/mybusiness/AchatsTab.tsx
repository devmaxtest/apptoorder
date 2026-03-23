import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Receipt, Plus, Trash2, Edit, Check, Clock, AlertTriangle, Building2, Search, Filter, ChevronUp, ChevronDown, Paperclip, Upload } from "lucide-react";
import { Purchase, SuguFile, PURCHASE_CATEGORIES, PAYMENT_METHODS, fmt, fmtDate, safeFloat, catLabel, normalizeCatKey } from "./types";
import { Card, StatCard, FormModal, Field, useInputClass, FormSelect, CardSizeToggle, btnPrimary, btnDanger, CategoryBadge, PeriodFilter, usePeriodFilter, FileUploadModal, FilePreviewModal, CategoryFiles } from "./shared";

interface AchatsTabProps {
    tenantId: string;
    purchases: Purchase[];
    compactCards: boolean;
    setCompactCards: (v: boolean) => void;
    createMut: any;
    updateMut: any;
    deleteMut: any;
    files: SuguFile[];
    uploadFileMut: any;
    deleteFileMut: any;
    sendEmailMut: any;
}

export function AchatsTab({ tenantId, purchases, compactCards, setCompactCards, createMut, updateMut, deleteMut, files, uploadFileMut, deleteFileMut, sendEmailMut }: AchatsTabProps) {
    const ic = useInputClass();
    const { toast } = useToast();
    const pf = usePeriodFilter("year");
    const [showForm, setShowForm] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [form, setForm] = useState<Partial<Purchase>>({ category: "alimentaire", isPaid: false, paymentMethod: "virement" });
    const [editForm, setEditForm] = useState<Partial<Purchase>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
    const [sort, setSort] = useState<{ field: "date" | "supplier" | "category" | "amount" | "paid"; dir: "asc" | "desc" }>({ field: "date", dir: "desc" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [quickSupplier, setQuickSupplier] = useState("");
    const [quickAmount, setQuickAmount] = useState("");
    const [quickCategory, setQuickCategory] = useState("alimentaire");
    const [quickInvDate, setQuickInvDate] = useState(new Date().toISOString().substring(0, 10));
    const [supplierFilter, setSupplierFilter] = useState("all");
    const [showFileUpload, setShowFileUpload] = useState<number | null>(null);
    const [previewFile, setPreviewFile] = useState<SuguFile | null>(null);
    const [showFilesForPurchase, setShowFilesForPurchase] = useState<number | null>(null);

    const purchaseFiles = useMemo(() => {
        return (files || []).filter(f => f.linkedEntityType === "purchase");
    }, [files]);
    const [amountMin, setAmountMin] = useState("");
    const [amountMax, setAmountMax] = useState("");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const defaultForm: Partial<Purchase> = { category: "alimentaire", isPaid: false, paymentMethod: "virement" };

    const today = useMemo(() => new Date(), []);

    const { filtered, pageData, totalPages, stats, filteredTotalTTC, filteredTotalTVA } = useMemo(() => {
        const withMeta = (purchases || []).map(p => {
            const due = p.dueDate ? new Date(`${p.dueDate}T00:00:00`) : null;
            const isOverdue = !p.isPaid && due && due < today;
            const isDueSoon = !p.isPaid && due && due >= today && (due.getTime() - today.getTime()) <= 30 * 86400000;
            return { ...p, due, isOverdue: !!isOverdue, isDueSoon: !!isDueSoon };
        });

        let list = withMeta;
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(p => p.supplier.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.invoiceNumber || "").toLowerCase().includes(q));
        }
        if (categoryFilter !== "all") list = list.filter(p => p.category === categoryFilter);
        if (paidFilter === "paid") list = list.filter(p => p.isPaid);
        if (paidFilter === "unpaid") list = list.filter(p => !p.isPaid);
        if (supplierFilter !== "all") list = list.filter(p => p.supplier === supplierFilter);
        list = list.filter(p => (p.invoiceDate || "") >= pf.period.from && (p.invoiceDate || "") <= pf.period.to);
        if (amountMin) list = list.filter(p => p.amount >= parseFloat(amountMin));
        if (amountMax) list = list.filter(p => p.amount <= parseFloat(amountMax));

        list = [...list].sort((a, b) => {
            let cmp = 0;
            switch (sort.field) {
                case "date": cmp = (a.invoiceDate || "").localeCompare(b.invoiceDate || ""); break;
                case "supplier": cmp = a.supplier.localeCompare(b.supplier, "fr", { sensitivity: "base" }); break;
                case "category": cmp = a.category.localeCompare(b.category); break;
                case "amount": cmp = a.amount - b.amount; break;
                case "paid": cmp = Number(a.isPaid) - Number(b.isPaid); break;
            }
            return sort.dir === "asc" ? cmp : -cmp;
        });

        const byCategory: Record<string, number> = {};
        list.forEach(p => { const k = normalizeCatKey(p.category); byCategory[k] = (byCategory[k] || 0) + p.amount; });
        const overdueCount = withMeta.filter(p => p.isOverdue).length;
        const dueSoonCount = withMeta.filter(p => p.isDueSoon).length;

        const tp = Math.max(1, Math.ceil(list.length / pageSize));
        const cp = Math.min(page, tp);
        const pageSlice = list.slice((cp - 1) * pageSize, cp * pageSize);
        const filteredTotalTTC = list.reduce((s, p) => s + (p.amount || 0), 0);
        const filteredTotalTVA = list.reduce((s, p) => s + (p.taxAmount || 0), 0);
        return { filtered: list, pageData: pageSlice, totalPages: tp, stats: { byCategory, overdueCount, dueSoonCount }, filteredTotalTTC, filteredTotalTVA };
    }, [purchases, searchTerm, categoryFilter, paidFilter, supplierFilter, pf.period.from, pf.period.to, amountMin, amountMax, sort, page, pageSize, today]);

    useEffect(() => { setPage(1); }, [searchTerm, categoryFilter, paidFilter, supplierFilter, pf.period.from, pf.period.to, amountMin, amountMax, sort]);

    const openEdit = (p: Purchase) => {
        setEditingPurchase(p);
        setEditForm({ supplier: p.supplier, category: p.category, description: p.description, amount: p.amount, taxAmount: p.taxAmount, invoiceNumber: p.invoiceNumber, invoiceDate: p.invoiceDate, dueDate: p.dueDate, isPaid: p.isPaid, paymentMethod: p.paymentMethod });
    };

    const exportCSV = () => {
        if (filtered.length === 0) return toast({ title: "Aucune donnée à exporter" });
        const header = ["Date Facture", "Fournisseur", "Catégorie", "Description", "N° Facture", "Montant TTC", "TVA", "Échéance", "Payé", "Mode Paiement"];
        const rows = filtered.map(p => [p.invoiceDate || "", p.supplier, catLabel(p.category), p.description || "", p.invoiceNumber || "", String(p.amount ?? ""), String(p.taxAmount ?? ""), p.dueDate || "", p.isPaid ? "oui" : "non", p.paymentMethod || ""]);
        const csv = [header, ...rows].map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "achats.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const purchaseFormFields = (f: Partial<Purchase>, setF: (v: Partial<Purchase>) => void) => (
        <>
            <Field label="Fournisseur"><input data-testid="input-purchase-supplier" className={ic} value={f.supplier || ""} onChange={e => setF({ ...f, supplier: e.target.value })} placeholder="METRO, POMONA..." /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Catégorie">
                    <FormSelect data-testid="select-purchase-category" className={ic} value={f.category || "alimentaire"} onChange={e => setF({ ...f, category: e.target.value })}>
                        {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </FormSelect>
                </Field>
                <Field label="Mode de paiement">
                    <FormSelect data-testid="select-purchase-payment" className={ic} value={f.paymentMethod || "virement"} onChange={e => setF({ ...f, paymentMethod: e.target.value })}>
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{catLabel(m)}</option>)}
                    </FormSelect>
                </Field>
            </div>
            <Field label="Description"><input data-testid="input-purchase-description" className={ic} value={f.description || ""} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Montant TTC (€)"><input data-testid="input-purchase-amount" type="number" step="0.01" className={ic} value={f.amount ?? ""} onChange={e => setF({ ...f, amount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
                <Field label="TVA (€)"><input data-testid="input-purchase-tax" type="number" step="0.01" className={ic} value={f.taxAmount ?? ""} onChange={e => setF({ ...f, taxAmount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Date facture"><input data-testid="input-purchase-date" type="date" className={ic} value={f.invoiceDate || ""} onChange={e => setF({ ...f, invoiceDate: e.target.value })} /></Field>
                <Field label="Échéance"><input data-testid="input-purchase-due" type="date" className={ic} value={f.dueDate || ""} onChange={e => setF({ ...f, dueDate: e.target.value })} /></Field>
            </div>
            <Field label="N° Facture"><input data-testid="input-purchase-invoice" className={ic} value={f.invoiceNumber || ""} onChange={e => setF({ ...f, invoiceNumber: e.target.value })} /></Field>
        </>
    );

    return (
        <div className="space-y-6">
            <PeriodFilter {...pf} />
            <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-400 text-[16px]">Chiffres clés</span>
                <CardSizeToggle compact={compactCards} setCompact={setCompactCards} />
            </div>
            <div className={`grid ${compactCards ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 md:grid-cols-6"} gap-3`}>
                <StatCard label="Total TTC" value={fmt(filteredTotalTTC)} icon={ShoppingCart} color="orange" compact={compactCards} />
                <StatCard label="Total TVA" value={fmt(filteredTotalTVA)} icon={Receipt} color="blue" compact={compactCards} />
                <StatCard label="Impayés" value={fmt(filtered.filter(p => !p.isPaid).reduce((s, p) => s + p.amount, 0))} icon={AlertTriangle} color="red" compact={compactCards} />
                <StatCard label="Fournisseurs" value={String(new Set(filtered.map(p => p.supplier)).size)} icon={Building2} color="blue" compact={compactCards} />
                <StatCard label="Échéances < 30j" value={String(stats.dueSoonCount)} icon={Clock} color="orange" compact={compactCards} />
                <StatCard label="En retard" value={String(stats.overdueCount)} icon={AlertTriangle} color="red" compact={compactCards} />
            </div>
            <div className="space-y-2">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 lg:col-span-2">
                        <Search className="w-4 h-4 flex-shrink-0 text-white/40" />
                        <input data-testid="input-search-achats" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher fournisseur, n° facture..." className="bg-transparent w-full text-sm focus:outline-none text-white" />
                    </div>
                    <FormSelect data-testid="select-category-achats" title="Filtrer par catégorie" className={ic} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option value="all">Toutes les catégories</option>
                        {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </FormSelect>
                    <FormSelect data-testid="select-paid-achats" title="Filtrer par statut" className={ic} value={paidFilter} onChange={e => setPaidFilter(e.target.value as any)}>
                        <option value="all">Payé + Impayé</option>
                        <option value="unpaid">Impayés</option>
                        <option value="paid">Payés</option>
                    </FormSelect>
                    <div className="flex gap-2">
                        <button data-testid="button-toggle-advanced-filters" onClick={() => setShowAdvancedFilters(v => !v)} className={`px-3 py-2 text-sm rounded-lg border ${showAdvancedFilters ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : "bg-white/5 border-white/10"} flex items-center gap-1.5 whitespace-nowrap`}>
                            <Filter className="w-3.5 h-3.5" /> Filtres
                        </button>
                        <button onClick={exportCSV} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white whitespace-nowrap">Export CSV</button>
                    </div>
                </div>
                {showAdvancedFilters && (
                    <div className="bg-white/5 border-white/10 border rounded-xl p-3 grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-xs mb-1 text-white/50">Fournisseur</label>
                            <FormSelect className={ic} value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
                                <option value="all">Tous les fournisseurs</option>
                                {Array.from(new Set((purchases || []).map(p => p.supplier))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                            </FormSelect>
                        </div>
                        <div>
                            <label className="block text-xs mb-1 text-white/50">Montant min (€)</label>
                            <input type="number" step="0.01" className={ic} value={amountMin} onChange={e => setAmountMin(e.target.value)} placeholder="0" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-white/50">Montant max (€)</label>
                            <div className="flex gap-2">
                                <input type="number" step="0.01" className={ic + " flex-1"} value={amountMax} onChange={e => setAmountMax(e.target.value)} placeholder="∞" />
                                <button onClick={() => { setSupplierFilter("all"); setAmountMin(""); setAmountMax(""); }} className="px-2 py-1.5 text-xs rounded-lg bg-white/10 text-white/60 hover:bg-white/20 whitespace-nowrap">✕ Reset</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {Object.keys(stats.byCategory).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                        <div key={cat} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[14px] pt-[0px] pb-[0px]">
                            <p className="text-xs text-white/40">{catLabel(cat)}</p>
                            <p className="font-bold font-mono text-[14px] text-white">{fmt(total)}</p>
                        </div>
                    ))}
                </div>
            )}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <span className="text-sm font-medium text-orange-300">{selectedIds.size} sélectionné(s)</span>
                    <button onClick={() => {
                        if (confirm(`Marquer ${selectedIds.size} achat(s) comme payé(s) ?`))
                            Array.from(selectedIds).forEach(id => updateMut.mutate({ id, data: { isPaid: true } }));
                        setSelectedIds(new Set());
                    }} className="px-3 py-1 text-xs rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium">✓ Marquer payé</button>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-white/40 hover:text-white/60">Désélectionner tout</button>
                </div>
            )}
            <Card title="Liste des Achats" icon={ShoppingCart}
                action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus className="w-4 h-4" /> Nouvel Achat</button>}>
                {(purchases || []).length === 0 ? (
                    <p className="text-white/40 text-center py-8">Aucun achat enregistré</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-white/40 border-b border-white/10">
                                    <th className="py-2 px-2 w-8">
                                        <input type="checkbox" className="rounded" checked={pageData.length > 0 && pageData.every(p => selectedIds.has(p.id))} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) pageData.forEach(p => next.add(p.id)); else pageData.forEach(p => next.delete(p.id)); setSelectedIds(next); }} />
                                    </th>
                                    {([
                                        { id: "date", label: "Date" },
                                        { id: "supplier", label: "Fournisseur" },
                                        { id: "category", label: "Catégorie" },
                                        { id: "amount", label: "Montant TTC" }
                                    ] as const).map(col => (
                                        <th key={col.id} className={`${col.id === "amount" ? "text-right" : "text-left"} py-2 px-2`}>
                                            <button onClick={() => setSort(s => s.field === col.id ? { field: col.id, dir: s.dir === "asc" ? "desc" : "asc" } : { field: col.id, dir: col.id === "supplier" ? "asc" : "desc" })} className="flex items-center gap-1 text-white/70 hover:text-white">
                                                <span>{col.label}</span>
                                                {sort.field === col.id ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3 text-orange-400" /> : <ChevronDown className="w-3 h-3 text-orange-400" />) : <span className="w-3 h-3 opacity-20">↕</span>}
                                            </button>
                                        </th>
                                    ))}
                                    <th className="text-right py-2 px-2">TVA</th>
                                    <th className="text-left py-2 px-2">N° Facture</th>
                                    <th className="text-right py-2 px-2">Actions</th>
                                    <th className="text-center py-2 px-2">Payé</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageData.map((p: any) => {
                                    const rowClass = selectedIds.has(p.id) ? "bg-orange-500/10" : p.isOverdue ? "bg-red-500/5" : p.isDueSoon ? "bg-amber-500/5" : "";
                                    return (
                                        <tr key={p.id} className={`${rowClass} border-b border-white/5 hover:bg-white/5`}>
                                            <td className="py-2 px-2 w-8">
                                                <input type="checkbox" className="rounded" checked={selectedIds.has(p.id)} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) next.add(p.id); else next.delete(p.id); setSelectedIds(next); }} />
                                            </td>
                                            <td className="py-2 px-2 text-white/60 whitespace-nowrap">
                                                {fmtDate(p.invoiceDate)}
                                                {p.isOverdue && <span className="ml-1 text-[11px] text-red-300">Retard</span>}
                                                {!p.isOverdue && p.isDueSoon && <span className="ml-1 text-[11px] text-amber-300">Éch. 30j</span>}
                                            </td>
                                            <td className="py-2 px-2 font-medium text-white">{p.supplier}</td>
                                            <td className="py-2 px-2"><CategoryBadge cat={p.category} /></td>
                                            <td className="py-2 px-2 text-right font-mono font-semibold text-white">{fmt(p.amount)}</td>
                                            <td className="py-2 px-2 text-right font-mono text-white/50">{p.taxAmount ? fmt(p.taxAmount) : "—"}</td>
                                            <td className="py-2 px-2 text-white/40 text-xs">{p.invoiceNumber || "—"}</td>
                                            <td className="py-2 px-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setShowFileUpload(p.id)} className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors relative" title="Fichiers">
                                                        <Paperclip className="w-3 h-3" />
                                                        {purchaseFiles.filter(f => f.linkedEntityId === p.id).length > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 text-[8px] text-white flex items-center justify-center">{purchaseFiles.filter(f => f.linkedEntityId === p.id).length}</span>
                                                        )}
                                                    </button>
                                                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Modifier"><Edit className="w-3 h-3" /></button>
                                                    <button onClick={() => { if (confirm("Supprimer cet achat ?")) deleteMut.mutate(p.id); }} className={btnDanger} title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <button onClick={() => updateMut.mutate({ id: p.id, data: { isPaid: !p.isPaid } })} className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isPaid ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                                                    {p.isPaid ? "Payé" : "Impayé"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="flex items-center justify-between py-3 text-sm text-white/70">
                            <span className="flex items-center gap-2">{filtered.length} achat{filtered.length > 1 ? "s" : ""} • Page {Math.min(page, totalPages)} / {totalPages}
                                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-0.5 rounded-lg border text-xs bg-[#1e1e2e] border-white/10 text-white/70" style={{ colorScheme: "dark" }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select>/page
                            </span>
                            <div className="flex gap-2">
                                <button disabled={page <= 1} onClick={() => setPage(1)} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">⇤</button>
                                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Préc.</button>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Suiv.</button>
                                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">⇥</button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                <div className="flex-1 min-w-[160px]">
                    <label className="text-xs text-white/50">Fournisseur</label>
                    <input data-testid="input-quick-supplier" value={quickSupplier} onChange={e => setQuickSupplier(e.target.value)} className={ic} placeholder="METRO, POMONA..." />
                </div>
                <div className="w-full lg:w-32">
                    <label className="text-xs text-white/50">Montant (€)</label>
                    <input data-testid="input-quick-amount" type="number" step="0.01" value={quickAmount} onChange={e => setQuickAmount(e.target.value)} className={ic} />
                </div>
                <div className="w-full lg:w-40">
                    <label className="text-xs text-white/50">Catégorie</label>
                    <FormSelect className={ic} value={quickCategory} onChange={e => setQuickCategory(e.target.value)}>
                        {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </FormSelect>
                </div>
                <div className="w-full lg:w-36">
                    <label className="text-xs text-white/50">Date facture</label>
                    <input type="date" value={quickInvDate} onChange={e => setQuickInvDate(e.target.value)} className={ic} style={{ colorScheme: "dark" }} />
                </div>
                <button data-testid="button-quick-add-purchase" onClick={() => {
                    if (!quickSupplier.trim()) return toast({ title: "Fournisseur requis", variant: "destructive" });
                    if (!quickAmount) return toast({ title: "Montant requis", variant: "destructive" });
                    createMut.mutate({ supplier: quickSupplier.trim(), amount: safeFloat(quickAmount), category: quickCategory, invoiceDate: quickInvDate, isPaid: false });
                    setQuickSupplier(""); setQuickAmount("");
                    toast({ title: "Achat ajouté (rapide)" });
                }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold whitespace-nowrap">
                    + Ajout rapide
                </button>
            </div>

            <FormModal title="Nouvel Achat" open={showForm} onClose={() => setShowForm(false)}>
                {purchaseFormFields(form, setForm)}
                <button onClick={() => { createMut.mutate(form); setShowForm(false); setForm(defaultForm); }} className={btnPrimary + " w-full justify-center"} disabled={!form.supplier || !form.amount}>
                    <Check className="w-4 h-4" /> Enregistrer
                </button>
            </FormModal>

            <FormModal title="Modifier Achat" open={!!editingPurchase} onClose={() => setEditingPurchase(null)}>
                {purchaseFormFields(editForm, setEditForm)}
                <button onClick={() => { if (editingPurchase) updateMut.mutate({ id: editingPurchase.id, data: editForm }); setEditingPurchase(null); }} className={btnPrimary + " w-full justify-center"} disabled={!editForm.supplier || !editForm.amount}>
                    <Check className="w-4 h-4" /> Mettre à jour
                </button>
            </FormModal>

            {showFileUpload !== null && (
                <FileUploadModal
                    open={true}
                    onClose={() => setShowFileUpload(null)}
                    onUpload={(fd) => uploadFileMut.mutate(fd)}
                    linkedEntityType="purchase"
                    linkedEntityId={showFileUpload}
                    isPending={uploadFileMut.isPending}
                />
            )}

            {showFileUpload !== null && purchaseFiles.filter(f => f.linkedEntityId === showFileUpload).length > 0 && (
                <div className="mt-4">
                    <CategoryFiles
                        files={purchaseFiles.filter(f => f.linkedEntityId === showFileUpload)}
                        onPreview={setPreviewFile}
                        onDelete={(id) => deleteFileMut.mutate(id)}
                    />
                </div>
            )}

            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    open={true}
                    onClose={() => setPreviewFile(null)}
                    onDelete={(id) => { deleteFileMut.mutate(id); setPreviewFile(null); }}
                    onEmail={(file) => sendEmailMut.mutate({ fileId: file.id, to: "", subject: file.originalName, body: "" })}
                />
            )}
        </div>
    );
}
