import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Trash2, Edit, Check, Calendar, BarChart3, TrendingUp, Eye, Search, ChevronUp, ChevronDown, Calculator, Camera } from "lucide-react";
import { CashEntry, fmt, fmtDate, safeFloat, fmtEur } from "./types";
import { Card, StatCard, FormModal, Field, useInputClass, FormSelect, CardSizeToggle, btnPrimary, btnDanger, PeriodFilter, usePeriodFilter, CameraModal } from "./shared";

interface CaisseTabProps {
    tenantId: string;
    cashEntries: CashEntry[];
    compactCards: boolean;
    setCompactCards: (v: boolean) => void;
    createMut: any;
    updateMut: any;
    deleteMut: any;
    showNewCaisseForm?: boolean;
    onCloseNewCaisseForm?: () => void;
    scanTicketMut: any;
}

export function CaisseTab({ tenantId, cashEntries, compactCards, setCompactCards, createMut, updateMut, deleteMut, showNewCaisseForm, onCloseNewCaisseForm, scanTicketMut }: CaisseTabProps) {
    const ic = useInputClass();
    const { toast } = useToast();
    const pf = usePeriodFilter("month");
    const [showForm, setShowForm] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);
    const [viewingEntry, setViewingEntry] = useState<CashEntry | null>(null);
    const [sort, setSort] = useState<{ field: "date" | "revenue" | "covers"; dir: "asc" | "desc" }>({ field: "date", dir: "desc" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (showNewCaisseForm) setShowForm(true);
    }, [showNewCaisseForm]);

    const todayStr = new Date().toISOString().substring(0, 10);
    const [form, setForm] = useState<Partial<CashEntry>>({ entryDate: todayStr, totalRevenue: 0, cashAmount: 0, cbAmount: 0, cbzenAmount: 0, trAmount: 0, ctrAmount: 0, ubereatsAmount: 0, deliverooAmount: 0, chequeAmount: 0, virementAmount: 0, ticketRestoAmount: 0, onlineAmount: 0, coversCount: 0, averageTicket: 0 });
    const [editForm, setEditForm] = useState<Partial<CashEntry>>({});

    const resetForm = () => setForm({ entryDate: todayStr, totalRevenue: 0, cashAmount: 0, cbAmount: 0, cbzenAmount: 0, trAmount: 0, ctrAmount: 0, ubereatsAmount: 0, deliverooAmount: 0, chequeAmount: 0, virementAmount: 0, ticketRestoAmount: 0, onlineAmount: 0, coversCount: 0, averageTicket: 0 });

    const { filtered, pageData, totalPages, stats } = useMemo(() => {
        let list = [...(cashEntries || [])];
        list = list.filter(e => e.entryDate >= pf.period.from && e.entryDate <= pf.period.to);
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(e => (e.notes || "").toLowerCase().includes(q) || e.entryDate.includes(q));
        }
        list.sort((a, b) => {
            let cmp = 0;
            if (sort.field === "date") cmp = a.entryDate.localeCompare(b.entryDate);
            else if (sort.field === "revenue") cmp = a.totalRevenue - b.totalRevenue;
            else if (sort.field === "covers") cmp = (a.coversCount || 0) - (b.coversCount || 0);
            return sort.dir === "asc" ? cmp : -cmp;
        });
        const totalCA = list.reduce((s, e) => s + (e.totalRevenue || 0), 0);
        const totalCovers = list.reduce((s, e) => s + (e.coversCount || 0), 0);
        const totalCash = list.reduce((s, e) => s + (e.cashAmount || 0), 0);
        const totalCB = list.reduce((s, e) => s + (e.cbAmount || 0), 0);
        const totalUberEats = list.reduce((s, e) => s + (e.ubereatsAmount || 0), 0);
        const totalDeliveroo = list.reduce((s, e) => s + (e.deliverooAmount || 0), 0);
        const avgTicket = totalCovers > 0 ? totalCA / totalCovers : 0;
        const avgDaily = list.length > 0 ? totalCA / list.length : 0;
        const tp = Math.max(1, Math.ceil(list.length / pageSize));
        const cp = Math.min(page, tp);
        const pageSlice = list.slice((cp - 1) * pageSize, cp * pageSize);
        return { filtered: list, pageData: pageSlice, totalPages: tp, stats: { totalCA, totalCovers, totalCash, totalCB, totalUberEats, totalDeliveroo, avgTicket, avgDaily, days: list.length } };
    }, [cashEntries, pf.period, sort, page, pageSize, searchTerm]);

    useEffect(() => { setPage(1); }, [pf.period, sort, searchTerm]);

    const exportCSV = () => {
        if (filtered.length === 0) return toast({ title: "Aucune donnée" });
        const header = ["Date", "CA Total", "Espèces", "CB", "CB Zen", "TR", "CTR", "UberEats", "Deliveroo", "Chèques", "Virements", "Tickets Resto", "Online", "Couverts", "Ticket Moyen", "Notes"];
        const rows = filtered.map(e => [e.entryDate, String(e.totalRevenue), String(e.cashAmount || 0), String(e.cbAmount || 0), String(e.cbzenAmount || 0), String(e.trAmount || 0), String(e.ctrAmount || 0), String(e.ubereatsAmount || 0), String(e.deliverooAmount || 0), String(e.chequeAmount || 0), String(e.virementAmount || 0), String(e.ticketRestoAmount || 0), String(e.onlineAmount || 0), String(e.coversCount || 0), String(e.averageTicket || 0), e.notes || ""]);
        const csv = [header, ...rows].map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "journal_caisse.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const sumDetailFields = (f: Partial<CashEntry>): number => {
        return (f.cashAmount || 0) + (f.cbAmount || 0) + (f.cbzenAmount || 0) + (f.trAmount || 0) + (f.ctrAmount || 0) + (f.ubereatsAmount || 0) + (f.deliverooAmount || 0) + (f.chequeAmount || 0) + (f.virementAmount || 0) + (f.ticketRestoAmount || 0) + (f.onlineAmount || 0);
    };

    const caissFormFields = (f: Partial<CashEntry>, setF: (v: Partial<CashEntry>) => void) => {
        const autoTotal = sumDetailFields(f);
        const diff = (f.totalRevenue || 0) - autoTotal;
        return (
            <>
                <Field label="Date"><input type="date" className={ic} value={f.entryDate || todayStr} onChange={e => setF({ ...f, entryDate: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
                <Field label="CA Total (€)">
                    <div className="flex gap-2 items-center">
                        <input type="number" step="0.01" className={ic + " flex-1"} value={f.totalRevenue ?? 0} onChange={e => setF({ ...f, totalRevenue: safeFloat(e.target.value) })} />
                        <button type="button" onClick={() => setF({ ...f, totalRevenue: autoTotal })} className="text-[10px] px-2 py-1 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 whitespace-nowrap" title="Calculer depuis le détail">= {fmtEur(autoTotal)}</button>
                    </div>
                    {Math.abs(diff) > 0.01 && <p className={`text-[10px] mt-0.5 ${Math.abs(diff) > 5 ? "text-red-400" : "text-amber-400"}`}>Écart: {fmtEur(diff)}</p>}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Espèces"><input type="number" step="0.01" className={ic} value={f.cashAmount ?? 0} onChange={e => setF({ ...f, cashAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="CB"><input type="number" step="0.01" className={ic} value={f.cbAmount ?? 0} onChange={e => setF({ ...f, cbAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="CB Zen"><input type="number" step="0.01" className={ic} value={f.cbzenAmount ?? 0} onChange={e => setF({ ...f, cbzenAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="TR (Ticket Restaurant)"><input type="number" step="0.01" className={ic} value={f.trAmount ?? 0} onChange={e => setF({ ...f, trAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="CTR"><input type="number" step="0.01" className={ic} value={f.ctrAmount ?? 0} onChange={e => setF({ ...f, ctrAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="UberEats"><input type="number" step="0.01" className={ic} value={f.ubereatsAmount ?? 0} onChange={e => setF({ ...f, ubereatsAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="Deliveroo"><input type="number" step="0.01" className={ic} value={f.deliverooAmount ?? 0} onChange={e => setF({ ...f, deliverooAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="Chèques"><input type="number" step="0.01" className={ic} value={f.chequeAmount ?? 0} onChange={e => setF({ ...f, chequeAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="Virements"><input type="number" step="0.01" className={ic} value={f.virementAmount ?? 0} onChange={e => setF({ ...f, virementAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="Tickets Resto"><input type="number" step="0.01" className={ic} value={f.ticketRestoAmount ?? 0} onChange={e => setF({ ...f, ticketRestoAmount: safeFloat(e.target.value) })} /></Field>
                    <Field label="Online (web)"><input type="number" step="0.01" className={ic} value={f.onlineAmount ?? 0} onChange={e => setF({ ...f, onlineAmount: safeFloat(e.target.value) })} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Nb Couverts"><input type="number" className={ic} value={f.coversCount ?? 0} onChange={e => setF({ ...f, coversCount: parseInt(e.target.value) || 0 })} /></Field>
                    <Field label="Ticket moyen (€)"><input type="number" step="0.01" className={ic} value={f.averageTicket ?? 0} onChange={e => setF({ ...f, averageTicket: safeFloat(e.target.value) })} /></Field>
                </div>
                <Field label="Notes"><input className={ic} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
            </>
        );
    };

    return (
        <div className="space-y-6">
            <PeriodFilter periodKey={pf.periodKey} setPeriod={pf.setPeriod} customFrom={pf.customFrom} setCustomFrom={pf.setCustomFrom} customTo={pf.customTo} setCustomTo={pf.setCustomTo} />
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/40">Indicateurs clés</span>
                <CardSizeToggle compact={compactCards} setCompact={setCompactCards} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label={`CA ${pf.period.label}`} value={fmtEur(stats.totalCA)} icon={TrendingUp} color="green" compact={compactCards} />
                <StatCard label="Jours de caisse" value={String(stats.days)} icon={Calendar} color="orange" compact={compactCards} />
                <StatCard label="Ticket moyen" value={fmtEur(stats.avgTicket)} icon={Calculator} color="blue" compact={compactCards} />
                <StatCard label="CA moy/jour" value={fmtEur(stats.avgDaily)} icon={BarChart3} color="purple" compact={compactCards} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-white/40">Espèces</p>
                    <p className="font-mono font-bold text-white text-sm">{fmtEur(stats.totalCash)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-white/40">CB</p>
                    <p className="font-mono font-bold text-white text-sm">{fmtEur(stats.totalCB)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-white/40">UberEats</p>
                    <p className="font-mono font-bold text-white text-sm">{fmtEur(stats.totalUberEats)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-white/40">Deliveroo</p>
                    <p className="font-mono font-bold text-white text-sm">{fmtEur(stats.totalDeliveroo)}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-white/40">Couverts</p>
                    <p className="font-mono font-bold text-white text-sm">{stats.totalCovers}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-white/40">Ticket moy.</p>
                    <p className="font-mono font-bold text-white text-sm">{fmtEur(stats.avgTicket)}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-center">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 lg:col-span-2">
                    <Search className="w-4 h-4 text-white/40" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher par date ou notes..." className="bg-transparent w-full text-sm focus:outline-none text-white" />
                </div>
                <button onClick={exportCSV} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white">Export CSV</button>
            </div>
            <Card title="Journal de Caisse" icon={CreditCard}
                action={
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowCamera(true)} className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-1.5" data-testid="button-scan-ticket">
                            <Camera className="w-4 h-4" /> Scanner Ticket
                        </button>
                        <button onClick={() => setShowForm(true)} className={btnPrimary} data-testid="button-add-caisse"><Plus className="w-4 h-4" /> Nouvelle Saisie</button>
                    </div>
                }>
                {filtered.length === 0 ? (
                    <p className="text-white/40 text-center py-8">Aucune entrée de caisse sur cette période</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/40 border-b border-white/10">
                                    {([
                                        { id: "date", label: "Date" },
                                        { id: "revenue", label: "CA Total" },
                                        { id: "covers", label: "Couverts" },
                                    ] as const).map(col => (
                                        <th key={col.id} className={`${col.id === "revenue" ? "text-right" : "text-left"} py-2 px-2`}>
                                            <button onClick={() => setSort(s => s.field === col.id ? { field: col.id, dir: s.dir === "asc" ? "desc" : "asc" } : { field: col.id, dir: "desc" })} className="flex items-center gap-1 text-white/70 hover:text-white">
                                                <span>{col.label}</span>
                                                {sort.field === col.id ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3 text-orange-400" /> : <ChevronDown className="w-3 h-3 text-orange-400" />) : <span className="w-3 h-3 opacity-20">↕</span>}
                                            </button>
                                        </th>
                                    ))}
                                    <th className="text-right py-2 px-2">Espèces</th>
                                    <th className="text-right py-2 px-2">CB</th>
                                    <th className="text-right py-2 px-2">UberEats</th>
                                    <th className="text-right py-2 px-2">Deliveroo</th>
                                    <th className="text-right py-2 px-2">TM</th>
                                    <th className="text-right py-2 px-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageData.map(e => (
                                    <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-2 text-white/60 whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                                        <td className="py-2 px-2 text-right font-mono font-bold text-green-400">{fmtEur(e.totalRevenue)}</td>
                                        <td className="py-2 px-2">{e.coversCount || "—"}</td>
                                        <td className="py-2 px-2 text-right font-mono text-white/60">{e.cashAmount ? fmtEur(e.cashAmount) : "—"}</td>
                                        <td className="py-2 px-2 text-right font-mono text-white/60">{e.cbAmount ? fmtEur(e.cbAmount) : "—"}</td>
                                        <td className="py-2 px-2 text-right font-mono text-white/60">{e.ubereatsAmount ? fmtEur(e.ubereatsAmount) : "—"}</td>
                                        <td className="py-2 px-2 text-right font-mono text-white/60">{e.deliverooAmount ? fmtEur(e.deliverooAmount) : "—"}</td>
                                        <td className="py-2 px-2 text-right font-mono text-white/40">{e.averageTicket ? fmtEur(e.averageTicket) : (e.coversCount && e.coversCount > 0 ? fmtEur(e.totalRevenue / e.coversCount) : "—")}</td>
                                        <td className="py-2 px-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setViewingEntry(e)} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Détails"><Eye className="w-3 h-3" /></button>
                                                <button onClick={() => { setEditingEntry(e); setEditForm({ ...e }); }} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Modifier"><Edit className="w-3 h-3" /></button>
                                                <button onClick={() => { if (confirm("Supprimer cette entrée ?")) deleteMut.mutate(e.id); }} className={btnDanger}><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex items-center justify-between py-3 text-sm text-white/70">
                            <span>{filtered.length} entrées • Page {Math.min(page, totalPages)} / {totalPages}</span>
                            <div className="flex gap-2">
                                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Préc.</button>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">Suiv.</button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <FormModal title="Saisie de Caisse" open={showForm} onClose={() => { setShowForm(false); onCloseNewCaisseForm?.(); }}>
                {caissFormFields(form, setForm)}
                <button onClick={() => { createMut.mutate(form); setShowForm(false); onCloseNewCaisseForm?.(); resetForm(); toast({ title: "Entrée de caisse enregistrée" }); }} className={btnPrimary + " w-full justify-center"} disabled={!form.entryDate}><Check className="w-4 h-4" /> Enregistrer</button>
            </FormModal>
            <FormModal title="Modifier Saisie" open={!!editingEntry} onClose={() => setEditingEntry(null)}>
                {caissFormFields(editForm, setEditForm)}
                <button onClick={() => { if (editingEntry) updateMut.mutate({ id: editingEntry.id, data: editForm }); setEditingEntry(null); }} className={btnPrimary + " w-full justify-center"}><Check className="w-4 h-4" /> Mettre à jour</button>
            </FormModal>

            {viewingEntry && (
                <FormModal title={`Détails Caisse — ${fmtDate(viewingEntry.entryDate)}`} open={true} onClose={() => setViewingEntry(null)}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-white/40">CA Total</span><p className="font-mono text-green-400 font-bold">{fmtEur(viewingEntry.totalRevenue)}</p></div>
                        <div><span className="text-white/40">Couverts</span><p className="font-mono text-white">{viewingEntry.coversCount || "—"}</p></div>
                        <div><span className="text-white/40">Espèces</span><p className="font-mono text-white">{fmtEur(viewingEntry.cashAmount || 0)}</p></div>
                        <div><span className="text-white/40">CB</span><p className="font-mono text-white">{fmtEur(viewingEntry.cbAmount || 0)}</p></div>
                        <div><span className="text-white/40">CB Zen</span><p className="font-mono text-white">{fmtEur(viewingEntry.cbzenAmount || 0)}</p></div>
                        <div><span className="text-white/40">TR</span><p className="font-mono text-white">{fmtEur(viewingEntry.trAmount || 0)}</p></div>
                        <div><span className="text-white/40">CTR</span><p className="font-mono text-white">{fmtEur(viewingEntry.ctrAmount || 0)}</p></div>
                        <div><span className="text-white/40">UberEats</span><p className="font-mono text-white">{fmtEur(viewingEntry.ubereatsAmount || 0)}</p></div>
                        <div><span className="text-white/40">Deliveroo</span><p className="font-mono text-white">{fmtEur(viewingEntry.deliverooAmount || 0)}</p></div>
                        <div><span className="text-white/40">Chèques</span><p className="font-mono text-white">{fmtEur(viewingEntry.chequeAmount || 0)}</p></div>
                        <div><span className="text-white/40">Virements</span><p className="font-mono text-white">{fmtEur(viewingEntry.virementAmount || 0)}</p></div>
                        <div><span className="text-white/40">Tickets Resto</span><p className="font-mono text-white">{fmtEur(viewingEntry.ticketRestoAmount || 0)}</p></div>
                        <div><span className="text-white/40">Online</span><p className="font-mono text-white">{fmtEur(viewingEntry.onlineAmount || 0)}</p></div>
                        <div><span className="text-white/40">Ticket Moyen</span><p className="font-mono text-white">{viewingEntry.averageTicket ? fmtEur(viewingEntry.averageTicket) : "—"}</p></div>
                    </div>
                    {viewingEntry.notes && <div className="mt-3 text-sm text-white/60"><span className="text-white/40">Notes:</span> {viewingEntry.notes}</div>}
                </FormModal>
            )}

            <CameraModal
                open={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={(blob) => {
                    const formData = new FormData();
                    formData.append("image", blob, "ticket.jpg");
                    scanTicketMut.mutate(formData, {
                        onSuccess: (data: any) => {
                            setShowCamera(false);
                            if (data && data.data) {
                                const scanned = data.data;
                                setForm(f => ({
                                    ...f,
                                    totalRevenue: scanned.totalRevenue ?? f.totalRevenue,
                                    cashAmount: scanned.cashAmount ?? f.cashAmount,
                                    cbAmount: scanned.cbAmount ?? f.cbAmount,
                                    coversCount: scanned.coversCount ?? f.coversCount,
                                    entryDate: scanned.date || f.entryDate,
                                    notes: scanned.notes || f.notes,
                                }));
                                setShowForm(true);
                                toast({ title: "Ticket scanné — vérifiez les valeurs" });
                            }
                        },
                        onError: () => toast({ title: "Erreur de scan", variant: "destructive" }),
                    });
                }}
            />
        </div>
    );
}
