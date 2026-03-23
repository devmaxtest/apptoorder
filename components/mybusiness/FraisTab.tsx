import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Plus, Trash2, Edit, Check, Clock, AlertTriangle, Search, Filter, ChevronUp, ChevronDown, Paperclip } from "lucide-react";
import { Expense, SuguFile, EXPENSE_CATEGORIES, PAYMENT_METHODS, fmt, safeFloat, catLabel, normalizeCatKey } from "./types";
import { Card, StatCard, FormModal, Field, useInputClass, FormSelect, CardSizeToggle, btnPrimary, btnDanger, CategoryBadge, PeriodFilter, usePeriodFilter, FileUploadModal, FilePreviewModal, CategoryFiles } from "./shared";

interface FraisTabProps {
    tenantId: string;
    expenses: Expense[];
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

export function FraisTab({ tenantId, expenses, compactCards, setCompactCards, createMut, updateMut, deleteMut, files, uploadFileMut, deleteFileMut, sendEmailMut }: FraisTabProps) {
    const ic = useInputClass();
    const { toast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [form, setForm] = useState<Partial<Expense>>({ category: "energie", isPaid: false, isRecurring: true, period: new Date().toISOString().substring(0, 7) });
    const [editForm, setEditForm] = useState<Partial<Expense>>({});
    const [quickLabel, setQuickLabel] = useState("");
    const [quickAmount, setQuickAmount] = useState<string>("");
    const [quickCategory, setQuickCategory] = useState<string>("energie");
    const [quickDue, setQuickDue] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
    const [showFileUpload, setShowFileUpload] = useState<number | null>(null);
    const [previewFile, setPreviewFile] = useState<SuguFile | null>(null);
    const expenseFiles = useMemo(() => (files || []).filter(f => f.linkedEntityType === "expense"), [files]);
    const [sort, setSort] = useState<{ field: "due" | "amount" | "label" | "category" | "paid"; dir: "asc" | "desc" }>({ field: "due", dir: "desc" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const pf = usePeriodFilter("year");

    const defaultForm: Partial<Expense> = { category: "energie", isPaid: false, isRecurring: true, period: new Date().toISOString().substring(0, 7) };
    const today = useMemo(() => new Date(), []);

    const { filtered, pageData, totalPages, stats, filteredTotalTTC } = useMemo(() => {
        const withMeta = (expenses || []).map(e => {
            const due = e.dueDate ? new Date(`${e.dueDate}T00:00:00`) : (e.period ? new Date(`${e.period}-01T00:00:00`) : null);
            const isOverdue = !e.isPaid && due && due < today;
            const isDueSoon = !e.isPaid && due && due >= today && (due.getTime() - today.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            return { ...e, due, isOverdue: !!isOverdue, isDueSoon: !!isDueSoon };
        });

        let list = [...withMeta];
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(e => (e.label || "").toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q));
        }
        if (categoryFilter !== "all") list = list.filter(e => e.category === categoryFilter);
        if (paidFilter === "paid") list = list.filter(e => e.isPaid);
        if (paidFilter === "unpaid") list = list.filter(e => !e.isPaid);
        if (pf.period.from) list = list.filter(e => (e.dueDate || e.period || "") >= pf.period.from);
        if (pf.period.to) list = list.filter(e => (e.dueDate || e.period || "") <= pf.period.to);

        list.sort((a, b) => {
            let cmp = 0;
            if (sort.field === "due") cmp = (a.due?.getTime() || 0) - (b.due?.getTime() || 0);
            else if (sort.field === "amount") cmp = (a.amount || 0) - (b.amount || 0);
            else if (sort.field === "label") cmp = (a.label || "").localeCompare(b.label || "");
            else if (sort.field === "category") cmp = (a.category || "").localeCompare(b.category || "");
            else if (sort.field === "paid") cmp = Number(a.isPaid) - Number(b.isPaid);
            return sort.dir === "asc" ? cmp : -cmp;
        });

        const byCategory: Record<string, number> = {};
        list.forEach(e => { const k = normalizeCatKey(e.category); byCategory[k] = (byCategory[k] || 0) + e.amount; });
        const dueSoonCount = list.filter(e => e.isDueSoon).length;
        const overdueCount = list.filter(e => e.isOverdue).length;

        const tp = Math.max(1, Math.ceil(list.length / pageSize));
        const cp = Math.min(page, tp);
        const pageSlice = list.slice((cp - 1) * pageSize, cp * pageSize);
        const filteredTotalTTC = list.reduce((s, e) => s + (e.amount || 0), 0);
        return { filtered: list, pageData: pageSlice, totalPages: tp, stats: { byCategory, dueSoonCount, overdueCount }, filteredTotalTTC };
    }, [expenses, searchTerm, categoryFilter, paidFilter, pf.period, sort, page, pageSize, today]);

    useEffect(() => { setPage(1); }, [searchTerm, categoryFilter, paidFilter, pf.period, sort]);

    const openEdit = (e: Expense) => {
        setEditingExpense(e);
        setEditForm({ label: e.label, category: e.category, description: e.description, amount: e.amount, taxAmount: e.taxAmount, period: e.period, dueDate: e.dueDate, isPaid: e.isPaid, paymentMethod: e.paymentMethod, isRecurring: e.isRecurring, notes: e.notes });
    };

    const exportCSV = () => {
        if (filtered.length === 0) return toast({ title: "Aucune donnée à exporter" });
        const header = ["Fournisseur", "Catégorie", "MontantTTC", "TVA", "Échéance", "Période", "Payé", "Récurrent", "Notes"];
        const rows = filtered.map(e => [e.label || "", catLabel(e.category), String(e.amount ?? ""), String(e.taxAmount ?? ""), e.dueDate || "", e.period || "", e.isPaid ? "oui" : "non", e.isRecurring ? "oui" : "non", e.notes || ""]);
        const csv = [header, ...rows].map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "frais_generaux.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const fraisFormFields = (f: Partial<Expense>, setF: (v: Partial<Expense>) => void) => (
        <>
            <Field label="Fournisseur / Label"><input data-testid="input-expense-label" className={ic} value={f.label || ""} onChange={e => setF({ ...f, label: e.target.value })} placeholder="EDF, Orange..." /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Catégorie">
                    <FormSelect className={ic} value={f.category || "energie"} onChange={e => setF({ ...f, category: e.target.value })}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </FormSelect>
                </Field>
                <Field label="Période"><input type="month" className={ic} value={f.period || ""} onChange={e => setF({ ...f, period: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Montant TTC (€)"><input type="number" step="0.01" className={ic} value={f.amount ?? ""} onChange={e => setF({ ...f, amount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
                <Field label="TVA (€)"><input type="number" step="0.01" className={ic} value={f.taxAmount ?? ""} onChange={e => setF({ ...f, taxAmount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
            </div>
            <Field label="Échéance"><input type="date" className={ic} value={f.dueDate || ""} onChange={e => setF({ ...f, dueDate: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
            <Field label="Notes"><input className={ic} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm text-white/60">
                <input type="checkbox" checked={f.isRecurring ?? false} onChange={e => setF({ ...f, isRecurring: e.target.checked })} className="rounded" />
                Charge récurrente
            </label>
        </>
    );

    return (
        <div className="space-y-6">
            <PeriodFilter periodKey={pf.periodKey} setPeriod={pf.setPeriod} customFrom={pf.customFrom} setCustomFrom={pf.setCustomFrom} customTo={pf.customTo} setCustomTo={pf.setCustomTo} />
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/40">Indicateurs clés</span>
                <CardSizeToggle compact={compactCards} setCompact={setCompactCards} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total TTC" value={fmt(filteredTotalTTC)} icon={Receipt} color="orange" compact={compactCards} />
                <StatCard label="Impayés" value={fmt(filtered.filter(e => !e.isPaid).reduce((s, e) => s + e.amount, 0))} icon={AlertTriangle} color="red" compact={compactCards} />
                <StatCard label="Échéances < 30j" value={String(stats.dueSoonCount)} icon={Clock} color="blue" compact={compactCards} />
                <StatCard label="En retard" value={String(stats.overdueCount)} icon={AlertTriangle} color="red" compact={compactCards} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-center">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-white/40" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher fournisseur, notes..." className="bg-transparent w-full text-sm focus:outline-none text-white" />
                </div>
                <FormSelect className={ic} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                    <option value="all">Toutes les catégories</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                </FormSelect>
                <FormSelect className={ic} value={paidFilter} onChange={e => setPaidFilter(e.target.value as any)}>
                    <option value="all">Payé + Impayé</option>
                    <option value="unpaid">Impayés</option>
                    <option value="paid">Payés</option>
                </FormSelect>
                <button onClick={exportCSV} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Export CSV</button>
            </div>
            {Object.keys(stats.byCategory).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                        <div key={cat} className="bg-white/5 border border-white/10 rounded-xl p-3 pt-[0px] pb-[0px] text-[14px]">
                            <p className="text-xs text-white/40">{catLabel(cat)}</p>
                            <p className="font-bold font-mono text-[14px] text-white">{fmt(total)}</p>
                        </div>
                    ))}
                </div>
            )}
            <Card title="Liste des Frais Généraux" icon={Receipt}
                action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus className="w-4 h-4" /> Nouveau Frais</button>}>
                {(expenses || []).length === 0 ? (
                    <p className="text-white/40 text-center py-8">Aucun frais enregistré</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/40 border-b border-white/10">
                                    {([
                                        { id: "due", label: "Date" },
                                        { id: "label", label: "Fournisseur" },
                                        { id: "category", label: "Catégorie" },
                                        { id: "amount", label: "Montant TTC" }
                                    ] as const).map(col => (
                                        <th key={col.id} className={`${col.id === "amount" ? "text-right" : "text-left"} py-2 px-2`}>
                                            <button onClick={() => setSort(s => s.field === col.id ? { field: col.id, dir: s.dir === "asc" ? "desc" : "asc" } : { field: col.id, dir: col.id === "label" ? "asc" : "desc" })} className="flex items-center gap-1 text-white/70 hover:text-white">
                                                <span>{col.label}</span>
                                                {sort.field === col.id ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />) : <span className="w-3 h-3 opacity-20">↕</span>}
                                            </button>
                                        </th>
                                    ))}
                                    <th className="text-right py-2 px-2">TVA</th>
                                    <th className="text-right py-2 px-2">Actions</th>
                                    <th className="text-center py-2 px-2">Payé</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageData.map((e: any) => {
                                    const rowClass = e.isOverdue ? "bg-red-500/5" : e.isDueSoon ? "bg-amber-500/5" : "";
                                    return (
                                        <tr key={e.id} className={`${rowClass} border-b border-white/5 hover:bg-white/5`}>
                                            <td className="py-2 px-2 text-white/60 whitespace-nowrap">
                                                {e.dueDate ? new Date(e.dueDate).toLocaleDateString("fr-FR") : e.period || "—"}
                                                {e.isOverdue && <span className="ml-1 text-[11px] text-red-300">Retard</span>}
                                            </td>
                                            <td className="py-2 px-2 font-medium text-white">{e.label}</td>
                                            <td className="py-2 px-2"><CategoryBadge cat={e.category} /></td>
                                            <td className="py-2 px-2 text-right font-mono font-semibold text-white">{fmt(e.amount)}</td>
                                            <td className="py-2 px-2 text-right font-mono text-white/50">{e.taxAmount ? fmt(e.taxAmount) : "—"}</td>
                                            <td className="py-2 px-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setShowFileUpload(e.id)} className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors relative" title="Fichiers">
                                                        <Paperclip className="w-3 h-3" />
                                                        {expenseFiles.filter(f => f.linkedEntityId === e.id).length > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 text-[8px] text-white flex items-center justify-center">{expenseFiles.filter(f => f.linkedEntityId === e.id).length}</span>
                                                        )}
                                                    </button>
                                                    <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Modifier"><Edit className="w-3 h-3" /></button>
                                                    <button onClick={() => { if (confirm("Supprimer ce frais ?")) deleteMut.mutate(e.id); }} className={btnDanger} title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <button onClick={() => updateMut.mutate({ id: e.id, data: { isPaid: !e.isPaid } })} className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.isPaid ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                                                    {e.isPaid ? "Payé" : "Impayé"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="flex items-center justify-between py-3 text-sm text-white/70">
                            <span>{filtered.length} frais • Page {Math.min(page, totalPages)} / {totalPages}</span>
                            <div className="flex gap-2">
                                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Préc.</button>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Suiv.</button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                <div className="flex-1 min-w-[160px]">
                    <label className="text-xs text-white/50">Fournisseur</label>
                    <input value={quickLabel} onChange={e => setQuickLabel(e.target.value)} className={ic} placeholder="EDF, Orange..." />
                </div>
                <div className="w-full lg:w-32">
                    <label className="text-xs text-white/50">Montant (€)</label>
                    <input type="number" step="0.01" value={quickAmount} onChange={e => setQuickAmount(e.target.value)} className={ic} />
                </div>
                <div className="w-full lg:w-40">
                    <label className="text-xs text-white/50">Catégorie</label>
                    <FormSelect className={ic} value={quickCategory} onChange={e => setQuickCategory(e.target.value)}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                    </FormSelect>
                </div>
                <div className="w-full lg:w-36">
                    <label className="text-xs text-white/50">Échéance</label>
                    <input type="date" value={quickDue} onChange={e => setQuickDue(e.target.value)} className={ic} style={{ colorScheme: "dark" }} />
                </div>
                <button onClick={() => {
                    if (!quickLabel.trim()) return toast({ title: "Label requis", variant: "destructive" });
                    if (!quickAmount) return toast({ title: "Montant requis", variant: "destructive" });
                    createMut.mutate({ label: quickLabel.trim(), amount: safeFloat(quickAmount), category: quickCategory, dueDate: quickDue || undefined, period: new Date().toISOString().substring(0, 7), isPaid: false, isRecurring: false });
                    setQuickLabel(""); setQuickAmount(""); setQuickDue("");
                    toast({ title: "Frais ajouté (rapide)" });
                }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold whitespace-nowrap">
                    + Ajout rapide
                </button>
            </div>

            <FormModal title="Nouveau Frais" open={showForm} onClose={() => setShowForm(false)}>
                {fraisFormFields(form, setForm)}
                <button onClick={() => { createMut.mutate(form); setShowForm(false); setForm(defaultForm); }} className={btnPrimary + " w-full justify-center"} disabled={!form.label || !form.amount}>
                    <Check className="w-4 h-4" /> Enregistrer
                </button>
            </FormModal>

            <FormModal title="Modifier Frais" open={!!editingExpense} onClose={() => setEditingExpense(null)}>
                {fraisFormFields(editForm, setEditForm)}
                <button onClick={() => { if (editingExpense) updateMut.mutate({ id: editingExpense.id, data: editForm }); setEditingExpense(null); }} className={btnPrimary + " w-full justify-center"} disabled={!editForm.label || !editForm.amount}>
                    <Check className="w-4 h-4" /> Mettre à jour
                </button>
            </FormModal>

            {showFileUpload !== null && (
                <FileUploadModal
                    open={true}
                    onClose={() => setShowFileUpload(null)}
                    onUpload={(fd) => uploadFileMut.mutate(fd)}
                    linkedEntityType="expense"
                    linkedEntityId={showFileUpload}
                    isPending={uploadFileMut.isPending}
                />
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
