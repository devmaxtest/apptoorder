import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Plus, Trash2, Edit, Check, Clock, Search, ChevronUp, ChevronDown, Banknote, Calculator, TrendingUp, TrendingDown, Upload, FileText, Link2, CheckCircle } from "lucide-react";
import { BankEntry, Loan, fmt, fmtDate, safeFloat, catLabel, bankOpType } from "./types";
import { Card, StatCard, FormModal, Field, useInputClass, FormSelect, CardSizeToggle, btnPrimary, btnDanger, CategoryBadge, PeriodFilter, usePeriodFilter, ImportProgressBar } from "./shared";

const BANK_CATEGORIES = ["encaissement_cb", "plateforme", "encaissement_especes", "encaissement_virement", "virement_recu", "achat_fournisseur", "remboursement_fournisseur", "commission_plateforme", "loyer", "salaire", "virement_interne", "virement_emis", "frais_bancaires", "assurance", "emprunt", "leasing", "energie", "carburant", "telecom", "charges_sociales", "vehicule", "equipement", "prelevement", "credit_divers", "debit_divers", "divers"];
const LOAN_TYPES = ["amortissable", "in_fine", "credit_bail", "pret_pro", "ligne_credit", "pge"];

interface BanqueTabProps {
    tenantId: string;
    bankEntries: BankEntry[];
    loans: Loan[];
    compactCards: boolean;
    setCompactCards: (v: boolean) => void;
    createBankMut: any;
    updateBankMut: any;
    deleteBankMut: any;
    createLoanMut: any;
    updateLoanMut: any;
    deleteLoanMut: any;
    importBankMut: any;
    rapprochement: any;
    matchRapprochementMut: any;
}

export function BanqueTab({ tenantId, bankEntries, loans, compactCards, setCompactCards, createBankMut, updateBankMut, deleteBankMut, createLoanMut, updateLoanMut, deleteLoanMut, importBankMut, rapprochement, matchRapprochementMut }: BanqueTabProps) {
    const ic = useInputClass();
    const { toast } = useToast();
    const pf = usePeriodFilter("month");
    const [showBankForm, setShowBankForm] = useState(false);
    const [editingBank, setEditingBank] = useState<BankEntry | null>(null);
    const [bankForm, setBankForm] = useState<Partial<BankEntry>>({ bankName: "", category: "encaissement_cb", isReconciled: false });
    const [editBankForm, setEditBankForm] = useState<Partial<BankEntry>>({});
    const [showLoanForm, setShowLoanForm] = useState(false);
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
    const [loanForm, setLoanForm] = useState<Partial<Loan>>({ loanType: "amortissable" });
    const [editLoanForm, setEditLoanForm] = useState<Partial<Loan>>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sort, setSort] = useState<{ field: "date" | "label" | "amount" | "balance"; dir: "asc" | "desc" }>({ field: "date", dir: "desc" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [bankView, setBankView] = useState<"entries" | "loans">("entries");
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [showRapprochement, setShowRapprochement] = useState(false);
    const [quickLabel, setQuickLabel] = useState("");
    const [quickAmount, setQuickAmount] = useState("");
    const [quickDate, setQuickDate] = useState(new Date().toISOString().substring(0, 10));
    const [quickCategory, setQuickCategory] = useState("encaissement_cb");
    const [loanSearch, setLoanSearch] = useState("");

    const { filtered, pageData, totalPages, stats } = useMemo(() => {
        let list = [...(bankEntries || [])];
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(e => (e.label || "").toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q) || (e.bankName || "").toLowerCase().includes(q));
        }
        if (categoryFilter !== "all") list = list.filter(e => e.category === categoryFilter);
        list = list.filter(e => e.entryDate >= pf.period.from && e.entryDate <= pf.period.to);

        list.sort((a, b) => {
            let cmp = 0;
            if (sort.field === "date") cmp = a.entryDate.localeCompare(b.entryDate);
            else if (sort.field === "label") cmp = (a.label || "").localeCompare(b.label || "");
            else if (sort.field === "amount") cmp = a.amount - b.amount;
            else if (sort.field === "balance") cmp = (a.balance || 0) - (b.balance || 0);
            return sort.dir === "asc" ? cmp : -cmp;
        });

        const totalCredits = list.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
        const totalDebits = list.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
        const reconciledCount = list.filter(e => e.isReconciled).length;
        const lastBalance = list.length > 0 ? (list.find(e => e.balance != null)?.balance || 0) : 0;

        const tp = Math.max(1, Math.ceil(list.length / pageSize));
        const cp = Math.min(page, tp);
        const pageSlice = list.slice((cp - 1) * pageSize, cp * pageSize);
        return { filtered: list, pageData: pageSlice, totalPages: tp, stats: { totalCredits, totalDebits, reconciledCount, lastBalance, total: list.length } };
    }, [bankEntries, searchTerm, categoryFilter, pf.period, sort, page, pageSize]);

    useEffect(() => { setPage(1); }, [searchTerm, categoryFilter, pf.period, sort]);

    const filteredLoans = useMemo(() => {
        const list = [...(loans || [])];
        if (loanSearch.trim()) {
            const q = loanSearch.toLowerCase();
            return list.filter(l => (l.loanLabel || "").toLowerCase().includes(q) || (l.bankName || "").toLowerCase().includes(q));
        }
        return list;
    }, [loans, loanSearch]);

    const totalLoanMonthly = (loans || []).reduce((s, l) => s + (l.monthlyPayment || 0), 0);
    const totalLoanRemaining = (loans || []).reduce((s, l) => s + (l.remainingAmount || 0), 0);

    const exportCSV = () => {
        if (filtered.length === 0) return toast({ title: "Aucune donnée" });
        const header = ["Date", "Libellé", "Montant", "Solde", "Catégorie", "Banque", "Rapproché"];
        const rows = filtered.map(e => [e.entryDate, e.label, String(e.amount), String(e.balance ?? ""), e.category || "", e.bankName || "", e.isReconciled ? "oui" : "non"]);
        const csv = [header, ...rows].map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "banque.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const bankFormFields = (f: Partial<BankEntry>, setF: (v: Partial<BankEntry>) => void) => (
        <>
            <Field label="Banque"><input className={ic} value={f.bankName || ""} onChange={e => setF({ ...f, bankName: e.target.value })} placeholder="BNP, Crédit Agricole..." /></Field>
            <Field label="Date"><input type="date" className={ic} value={f.entryDate || ""} onChange={e => setF({ ...f, entryDate: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
            <Field label="Libellé"><input className={ic} value={f.label || ""} onChange={e => setF({ ...f, label: e.target.value })} placeholder="Virement, prélèvement..." /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Montant (€) — négatif = débit"><input type="number" step="0.01" className={ic} value={f.amount ?? ""} onChange={e => setF({ ...f, amount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
                <Field label="Solde après (€)"><input type="number" step="0.01" className={ic} value={f.balance ?? ""} onChange={e => setF({ ...f, balance: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
            </div>
            <Field label="Catégorie">
                <FormSelect className={ic} value={f.category || "divers"} onChange={e => setF({ ...f, category: e.target.value })}>
                    {BANK_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                </FormSelect>
            </Field>
            <Field label="Notes"><input className={ic} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        </>
    );

    const loanFormFields = (f: Partial<Loan>, setF: (v: Partial<Loan>) => void) => (
        <>
            <Field label="Label"><input className={ic} value={f.loanLabel || ""} onChange={e => setF({ ...f, loanLabel: e.target.value })} placeholder="Prêt matériel, PGE..." /></Field>
            <Field label="Banque"><input className={ic} value={f.bankName || ""} onChange={e => setF({ ...f, bankName: e.target.value })} placeholder="BNP, CIC..." /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                    <FormSelect className={ic} value={f.loanType || "amortissable"} onChange={e => setF({ ...f, loanType: e.target.value })}>
                        {LOAN_TYPES.map(t => <option key={t} value={t}>{catLabel(t)}</option>)}
                    </FormSelect>
                </Field>
                <Field label="Taux (%)"><input type="number" step="0.01" className={ic} value={f.interestRate ?? ""} onChange={e => setF({ ...f, interestRate: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Montant total (€)"><input type="number" step="0.01" className={ic} value={f.totalAmount ?? ""} onChange={e => setF({ ...f, totalAmount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
                <Field label="Capital restant (€)"><input type="number" step="0.01" className={ic} value={f.remainingAmount ?? ""} onChange={e => setF({ ...f, remainingAmount: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
            </div>
            <Field label="Mensualité (€)"><input type="number" step="0.01" className={ic} value={f.monthlyPayment ?? ""} onChange={e => setF({ ...f, monthlyPayment: e.target.value === "" ? undefined : safeFloat(e.target.value) })} /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Date début"><input type="date" className={ic} value={f.startDate || ""} onChange={e => setF({ ...f, startDate: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
                <Field label="Date fin"><input type="date" className={ic} value={f.endDate || ""} onChange={e => setF({ ...f, endDate: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
            </div>
            <Field label="Notes"><input className={ic} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        </>
    );

    return (
        <div className="space-y-6">
            <PeriodFilter periodKey={pf.periodKey} setPeriod={pf.setPeriod} customFrom={pf.customFrom} setCustomFrom={pf.setCustomFrom} customTo={pf.customTo} setCustomTo={pf.setCustomTo} />
            <div className="flex items-center gap-2">
                <button onClick={() => setBankView("entries")} className={`px-4 py-2 text-sm rounded-lg font-medium transition ${bankView === "entries" ? "bg-blue-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`} data-testid="btn-bank-entries"><Landmark className="w-4 h-4 inline mr-1" /> Écritures ({(bankEntries || []).length})</button>
                <button onClick={() => setBankView("loans")} className={`px-4 py-2 text-sm rounded-lg font-medium transition ${bankView === "loans" ? "bg-purple-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`} data-testid="btn-bank-loans"><Banknote className="w-4 h-4 inline mr-1" /> Emprunts ({(loans || []).length})</button>
            </div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/40">Indicateurs clés</span>
                <CardSizeToggle compact={compactCards} setCompact={setCompactCards} />
            </div>

            {bankView === "entries" ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Total crédits" value={fmt(stats.totalCredits)} icon={TrendingUp} color="green" compact={compactCards} />
                        <StatCard label="Total débits" value={fmt(stats.totalDebits)} icon={TrendingDown} color="red" compact={compactCards} />
                        <StatCard label="Solde fin" value={fmt(stats.lastBalance)} icon={Calculator} color="blue" compact={compactCards} />
                        <StatCard label="Rapprochés" value={`${stats.reconciledCount} / ${stats.total}`} icon={Check} color="orange" compact={compactCards} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-center">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 lg:col-span-2">
                            <Search className="w-4 h-4 text-white/40" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher libellé, banque..." className="bg-transparent w-full text-sm focus:outline-none text-white" />
                        </div>
                        <FormSelect className={ic} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                            <option value="all">Toutes catégories</option>
                            {BANK_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                        </FormSelect>
                        <button onClick={exportCSV} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Export CSV</button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <button onClick={() => setShowImport(true)} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center gap-2" data-testid="button-import-bank">
                            <Upload className="w-4 h-4" /> Importer Relevé
                        </button>
                        <button onClick={() => setShowRapprochement(!showRapprochement)} className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${showRapprochement ? "bg-orange-500 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:text-white"}`} data-testid="button-rapprochement">
                            <Link2 className="w-4 h-4" /> Rapprochement
                        </button>
                    </div>

                    <Card title="Écritures Bancaires" icon={Landmark}
                        action={<button onClick={() => setShowBankForm(true)} className={btnPrimary} data-testid="button-add-bank"><Plus className="w-4 h-4" /> Nouvelle Écriture</button>}>
                        {(bankEntries || []).length === 0 ? (
                            <p className="text-white/40 text-center py-8">Aucune écriture bancaire</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-white/40 border-b border-white/10">
                                            {([
                                                { id: "date", label: "Date" },
                                                { id: "label", label: "Libellé" },
                                                { id: "amount", label: "Montant" },
                                                { id: "balance", label: "Solde" },
                                            ] as const).map(col => (
                                                <th key={col.id} className={`${["amount", "balance"].includes(col.id) ? "text-right" : "text-left"} py-2 px-2`}>
                                                    <button onClick={() => setSort(s => s.field === col.id ? { field: col.id, dir: s.dir === "asc" ? "desc" : "asc" } : { field: col.id, dir: "desc" })} className="flex items-center gap-1 text-white/70 hover:text-white">
                                                        <span>{col.label}</span>
                                                        {sort.field === col.id ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />) : <span className="w-3 h-3 opacity-20">↕</span>}
                                                    </button>
                                                </th>
                                            ))}
                                            <th className="text-left py-2 px-2">Catégorie</th>
                                            <th className="text-right py-2 px-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageData.map(e => (
                                            <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-2 px-2 text-white/60 whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                                                <td className="py-2 px-2 text-white max-w-[200px] truncate" title={e.label}>{e.label}</td>
                                                <td className={`py-2 px-2 text-right font-mono font-semibold ${e.amount >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(e.amount)}</td>
                                                <td className="py-2 px-2 text-right font-mono text-white/50">{e.balance != null ? fmt(e.balance) : "—"}</td>
                                                <td className="py-2 px-2"><CategoryBadge cat={e.category} /></td>
                                                <td className="py-2 px-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => { setEditingBank(e); setEditBankForm({ bankName: e.bankName, entryDate: e.entryDate, label: e.label, amount: e.amount, balance: e.balance, category: e.category, notes: e.notes }); }} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Modifier"><Edit className="w-3 h-3" /></button>
                                                        <button onClick={() => { if (confirm("Supprimer ?")) deleteBankMut.mutate(e.id); }} className={btnDanger}><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex items-center justify-between py-3 text-sm text-white/70">
                                    <span>{filtered.length} écritures • Page {Math.min(page, totalPages)} / {totalPages}</span>
                                    <div className="flex gap-2">
                                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Préc.</button>
                                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Suiv.</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                        <div className="flex-1">
                            <label className="text-xs text-white/50">Libellé</label>
                            <input value={quickLabel} onChange={e => setQuickLabel(e.target.value)} className={ic} placeholder="Virement reçu..." />
                        </div>
                        <div className="w-full lg:w-28">
                            <label className="text-xs text-white/50">Montant (€)</label>
                            <input type="number" step="0.01" value={quickAmount} onChange={e => setQuickAmount(e.target.value)} className={ic} />
                        </div>
                        <div className="w-full lg:w-36">
                            <label className="text-xs text-white/50">Date</label>
                            <input type="date" value={quickDate} onChange={e => setQuickDate(e.target.value)} className={ic} style={{ colorScheme: "dark" }} />
                        </div>
                        <div className="w-full lg:w-40">
                            <label className="text-xs text-white/50">Catégorie</label>
                            <FormSelect className={ic} value={quickCategory} onChange={e => setQuickCategory(e.target.value)}>
                                {BANK_CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                            </FormSelect>
                        </div>
                        <button onClick={() => {
                            if (!quickLabel.trim() || !quickAmount) return toast({ title: "Libellé et montant requis", variant: "destructive" });
                            createBankMut.mutate({ label: quickLabel.trim(), amount: safeFloat(quickAmount), entryDate: quickDate, category: quickCategory, bankName: "", isReconciled: false });
                            setQuickLabel(""); setQuickAmount("");
                            toast({ title: "Écriture ajoutée" });
                        }} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold whitespace-nowrap">
                            + Ajout rapide
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="Emprunts actifs" value={String((loans || []).length)} icon={Banknote} color="purple" compact={compactCards} />
                        <StatCard label="Capital restant" value={fmt(totalLoanRemaining)} icon={Calculator} color="red" compact={compactCards} />
                        <StatCard label="Mensualités total" value={fmt(totalLoanMonthly)} icon={Clock} color="orange" compact={compactCards} />
                        <StatCard label="Total emprunté" value={fmt((loans || []).reduce((s, l) => s + l.totalAmount, 0))} icon={Landmark} color="blue" compact={compactCards} />
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-white/40" />
                        <input value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder="Rechercher emprunt, banque..." className="bg-transparent w-full text-sm focus:outline-none text-white" />
                    </div>
                    <Card title="Emprunts & Crédits" icon={Banknote}
                        action={<button onClick={() => setShowLoanForm(true)} className={btnPrimary} data-testid="button-add-loan"><Plus className="w-4 h-4" /> Nouvel Emprunt</button>}>
                        {filteredLoans.length === 0 ? (
                            <p className="text-white/40 text-center py-8">Aucun emprunt</p>
                        ) : (
                            <div className="grid gap-3">
                                {filteredLoans.map(l => {
                                    const pctRemaining = l.totalAmount > 0 ? (l.remainingAmount / l.totalAmount) * 100 : 0;
                                    return (
                                        <div key={l.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-white">{l.loanLabel}</h4>
                                                    <p className="text-xs text-white/50">{l.bankName} — {catLabel(l.loanType)}{l.interestRate ? ` • ${l.interestRate}%` : ""}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setEditingLoan(l); setEditLoanForm({ loanLabel: l.loanLabel, bankName: l.bankName, loanType: l.loanType, totalAmount: l.totalAmount, remainingAmount: l.remainingAmount, monthlyPayment: l.monthlyPayment, interestRate: l.interestRate, startDate: l.startDate, endDate: l.endDate, notes: l.notes }); }} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"><Edit className="w-3 h-3" /></button>
                                                    <button onClick={() => { if (confirm("Supprimer cet emprunt ?")) deleteLoanMut.mutate(l.id); }} className={btnDanger}><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                            <div className="mt-2 bg-white/5 rounded-full h-2">
                                                <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" style={{ width: `${100 - pctRemaining}%` }} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                                <div><span className="text-white/40">Total</span><p className="font-mono text-white">{fmt(l.totalAmount)}</p></div>
                                                <div><span className="text-white/40">Restant</span><p className="font-mono text-red-400">{fmt(l.remainingAmount)}</p></div>
                                                <div><span className="text-white/40">Mensualité</span><p className="font-mono text-orange-400">{fmt(l.monthlyPayment)}</p></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </>
            )}

            <FormModal title="Nouvelle Écriture Bancaire" open={showBankForm} onClose={() => setShowBankForm(false)}>
                {bankFormFields(bankForm, setBankForm)}
                <button onClick={() => { createBankMut.mutate(bankForm); setShowBankForm(false); setBankForm({ bankName: "", category: "encaissement_cb", isReconciled: false }); }} className={btnPrimary + " w-full justify-center"} disabled={!bankForm.label || bankForm.amount == null}><Check className="w-4 h-4" /> Enregistrer</button>
            </FormModal>
            <FormModal title="Modifier Écriture" open={!!editingBank} onClose={() => setEditingBank(null)}>
                {bankFormFields(editBankForm, setEditBankForm)}
                <button onClick={() => { if (editingBank) updateBankMut.mutate({ id: editingBank.id, data: editBankForm }); setEditingBank(null); }} className={btnPrimary + " w-full justify-center"} disabled={!editBankForm.label}><Check className="w-4 h-4" /> Mettre à jour</button>
            </FormModal>
            <FormModal title="Nouvel Emprunt" open={showLoanForm} onClose={() => setShowLoanForm(false)}>
                {loanFormFields(loanForm, setLoanForm)}
                <button onClick={() => { createLoanMut.mutate(loanForm); setShowLoanForm(false); setLoanForm({ loanType: "amortissable" }); }} className={btnPrimary + " w-full justify-center"} disabled={!loanForm.loanLabel || !loanForm.totalAmount}><Check className="w-4 h-4" /> Enregistrer</button>
            </FormModal>
            <FormModal title="Modifier Emprunt" open={!!editingLoan} onClose={() => setEditingLoan(null)}>
                {loanFormFields(editLoanForm, setEditLoanForm)}
                <button onClick={() => { if (editingLoan) updateLoanMut.mutate({ id: editingLoan.id, data: editLoanForm }); setEditingLoan(null); }} className={btnPrimary + " w-full justify-center"} disabled={!editLoanForm.loanLabel}><Check className="w-4 h-4" /> Mettre à jour</button>
            </FormModal>

            <FormModal title="Importer Relevé Bancaire" open={showImport} onClose={() => { setShowImport(false); setImportFile(null); }}>
                <div className="space-y-4">
                    <p className="text-sm text-white/60">Importez un fichier PDF ou CSV de relevé bancaire. Les écritures seront automatiquement extraites et ajoutées.</p>
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                        <input
                            type="file"
                            accept=".pdf,.csv,.ofx,.qif"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="bank-import-input"
                        />
                        <label htmlFor="bank-import-input" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                            <p className="text-sm text-white/50">{importFile ? importFile.name : "Cliquez ou déposez un fichier"}</p>
                            <p className="text-[10px] text-white/30 mt-1">PDF, CSV, OFX, QIF</p>
                        </label>
                    </div>
                    {importBankMut.isPending && <ImportProgressBar progress={50} label="Import en cours..." />}
                    <button
                        onClick={() => {
                            if (!importFile) return;
                            const formData = new FormData();
                            formData.append("file", importFile);
                            importBankMut.mutate(formData, {
                                onSuccess: () => { toast({ title: "Relevé importé avec succès" }); setShowImport(false); setImportFile(null); },
                                onError: () => toast({ title: "Erreur d'import", variant: "destructive" }),
                            });
                        }}
                        disabled={!importFile || importBankMut.isPending}
                        className={btnPrimary + " w-full justify-center"}
                    >
                        <FileText className="w-4 h-4" /> Importer
                    </button>
                </div>
            </FormModal>

            {showRapprochement && (
                <Card title="Rapprochement Bancaire" icon={Link2}>
                    {rapprochement && rapprochement.unmatched && rapprochement.unmatched.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-sm text-white/50">{rapprochement.unmatched.length} écriture(s) non rapprochée(s)</p>
                            <div className="space-y-2">
                                {rapprochement.unmatched.map((item: any, i: number) => (
                                    <div key={item.id || i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                        <div className="text-sm">
                                            <p className="text-white">{item.label}</p>
                                            <p className="text-xs text-white/40">{fmtDate(item.date)} • {fmt(item.amount)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {item.suggestion && (
                                                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                                                    Suggestion: {item.suggestion.label}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => matchRapprochementMut.mutate({ bankEntryId: item.id, matchType: item.suggestion?.type || "purchase", matchId: item.suggestion?.id })}
                                                disabled={!item.suggestion || matchRapprochementMut.isPending}
                                                className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 disabled:opacity-40"
                                                title="Rapprocher"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {rapprochement.matched && (
                                <p className="text-xs text-white/30">{rapprochement.matched.length} écriture(s) déjà rapprochée(s)</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-white/40 text-center py-4">Toutes les écritures sont rapprochées</p>
                    )}
                </Card>
            )}
        </div>
    );
}
