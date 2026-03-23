import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Edit, Check, Search, Clock, DollarSign, Briefcase, Receipt, AlertTriangle, Calculator, Eye, ChevronDown, ChevronUp, Upload, RefreshCw, Paperclip, FolderOpen } from "lucide-react";
import { Employee, Payroll, Absence, SuguFile, CONTRACT_TYPES, ABSENCE_TYPES, fmt, fmtDate, safeFloat } from "./types";
import { Card, StatCard, FormModal, Field, useInputClass, FormSelect, CardSizeToggle, btnPrimary, btnDanger, PeriodFilter, usePeriodFilter, FileUploadModal, FilePreviewModal, CategoryFiles, ImportProgressBar } from "./shared";

interface GestionRHTabProps {
    tenantId: string;
    employees: Employee[];
    payrolls: Payroll[];
    absences: Absence[];
    compactCards: boolean;
    setCompactCards: (v: boolean) => void;
    createEmpMut: any;
    updateEmpMut: any;
    deleteEmpMut: any;
    createPayMut: any;
    deletePayMut: any;
    updatePayMut: any;
    createAbsMut: any;
    deleteAbsMut: any;
    updateAbsMut: any;
    importPayrollMut: any;
    reparseMut: any;
    files: SuguFile[];
    uploadFileMut: any;
    deleteFileMut: any;
    sendEmailMut: any;
}

function EmployeeCard({ employee: e, dk, payrolls, onEdit, onDelete, onFiles, fileCount }: { employee: Employee; dk: boolean; payrolls: Payroll[]; onEdit: () => void; onDelete: () => void; onFiles?: () => void; fileCount?: number }) {
    const empPayrolls = payrolls.filter(p => p.employeeId === e.id);
    const lastPayroll = empPayrolls.sort((a, b) => b.period.localeCompare(a.period))[0];
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${e.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {e.firstName?.[0]}{e.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-semibold text-white truncate">{e.firstName} {e.lastName}</h4>
                        <p className="text-xs text-white/50 truncate">{e.role || "—"} • {e.contractType} {!e.isActive && <span className="text-red-400">(Inactif)</span>}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {onFiles && (
                        <button onClick={onFiles} className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 relative" title="Dossier employé">
                            <FolderOpen className="w-3 h-3" />
                            {(fileCount || 0) > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 text-[8px] text-white flex items-center justify-center">{fileCount}</span>}
                        </button>
                    )}
                    <button onClick={onEdit} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Modifier"><Edit className="w-3 h-3" /></button>
                    <button onClick={onDelete} className={btnDanger} title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                <div><span className="text-white/40">Salaire mensuel</span><p className="font-mono text-white">{e.monthlySalary ? fmt(e.monthlySalary) : "N/D"}</p></div>
                <div><span className="text-white/40">Début contrat</span><p className="text-white/60">{fmtDate(e.startDate)}</p></div>
                <div><span className="text-white/40">Taux horaire</span><p className="font-mono text-white">{e.hourlyRate ? `${e.hourlyRate} €/h` : "—"}</p></div>
                <div><span className="text-white/40">Dernier bulletin</span><p className="text-white/60">{lastPayroll ? lastPayroll.period : "—"}</p></div>
            </div>
            {(e.phone || e.email) && (
                <div className="mt-2 flex gap-4 text-xs text-white/40">
                    {e.phone && <span>{e.phone}</span>}
                    {e.email && <span>{e.email}</span>}
                </div>
            )}
        </div>
    );
}

export function GestionRHTab({ tenantId, employees, payrolls, absences, compactCards, setCompactCards, createEmpMut, updateEmpMut, deleteEmpMut, createPayMut, deletePayMut, updatePayMut, createAbsMut, deleteAbsMut, updateAbsMut, importPayrollMut, reparseMut, files, uploadFileMut, deleteFileMut, sendEmailMut }: GestionRHTabProps) {
    const ic = useInputClass();
    const { toast } = useToast();
    const pf = usePeriodFilter("year");
    const [showEmpForm, setShowEmpForm] = useState(false);
    const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
    const [showPayrollImport, setShowPayrollImport] = useState(false);
    const [payrollImportFile, setPayrollImportFile] = useState<File | null>(null);
    const [showEmpFiles, setShowEmpFiles] = useState<number | null>(null);
    const [showFileUpload, setShowFileUpload] = useState<number | null>(null);
    const [previewFile, setPreviewFile] = useState<SuguFile | null>(null);
    const empFiles = useMemo(() => (files || []).filter(f => f.linkedEntityType === "employee"), [files]);
    const [editEmpData, setEditEmpData] = useState<Partial<Employee>>({});
    const [empForm, setEmpForm] = useState<Partial<Employee>>({ contractType: "CDI", isActive: true, startDate: new Date().toISOString().substring(0, 10) });
    const [showPayrollForm, setShowPayrollForm] = useState(false);
    const [payrollForm, setPayrollForm] = useState<Partial<Payroll>>({ period: new Date().toISOString().substring(0, 7) });
    const [showAbsenceForm, setShowAbsenceForm] = useState(false);
    const [absenceForm, setAbsenceForm] = useState<Partial<Absence>>({ type: "conge", startDate: new Date().toISOString().substring(0, 10) });
    const [rhSearch, setRhSearch] = useState("");
    const [contractFilter, setContractFilter] = useState("all");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [viewingPayroll, setViewingPayroll] = useState<Payroll | null>(null);

    const activeEmps = (employees || []).filter(e => e.isActive);

    const filteredPayrolls = useMemo(() => {
        return (payrolls || []).filter(p => p.period >= pf.period.from.substring(0, 7) && p.period <= pf.period.to.substring(0, 7));
    }, [payrolls, pf.period]);

    const filteredAbsences = useMemo(() => {
        return (absences || []).filter(a => a.startDate >= pf.period.from && a.startDate <= pf.period.to);
    }, [absences, pf.period]);

    const filteredEmps = useMemo(() => {
        let list = [...(employees || [])];
        if (rhSearch.trim()) {
            const q = rhSearch.toLowerCase();
            list = list.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || (e.role || "").toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q));
        }
        if (contractFilter !== "all") list = list.filter(e => e.contractType === contractFilter);
        if (activeFilter === "active") list = list.filter(e => e.isActive);
        if (activeFilter === "inactive") list = list.filter(e => !e.isActive);
        return list;
    }, [employees, rhSearch, contractFilter, activeFilter]);

    const pendingAbsences = filteredAbsences.filter(a => !a.isApproved).length;
    const totalMonthlySalary = activeEmps.reduce((s, e) => s + (e.monthlySalary || 0), 0);

    const totalPayrollGross = filteredPayrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
    const totalPayrollNet = filteredPayrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalPayrollChargesSal = filteredPayrolls.reduce((s, p) => s + (p.socialCharges || 0), 0);
    const avgGrossPerEmp = filteredPayrolls.length > 0 ? totalPayrollGross / filteredPayrolls.length : 0;
    const totalEmployerCharges = filteredPayrolls.reduce((s, p) => s + (p.employerCharges || 0), 0);
    const totalCoutEmployeur = filteredPayrolls.reduce((s, p) => s + (p.totalEmployerCost || p.grossSalary || 0), 0);
    const hasGlobalEstimate = filteredPayrolls.some(p => !p.employerCharges && p.grossSalary > 0);
    const globalChargeRate = totalPayrollGross > 0 ? ((totalPayrollChargesSal / totalPayrollGross) * 100).toFixed(1) : "0.0";

    const empName = (id: number) => {
        const emp = (employees || []).find(e => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName}` : `#${id}`;
    };

    const typeLabel: Record<string, string> = { conge: "Congé", maladie: "Maladie", retard: "Retard", absence: "Absence", formation: "Formation" };

    const exportRhCSV = () => {
        if (filteredEmps.length === 0) return toast({ title: "Aucune donnée" });
        const header = ["Prénom", "Nom", "Poste", "Contrat", "Début", "Fin", "Salaire", "Actif"];
        const rows = filteredEmps.map(e => [e.firstName, e.lastName, e.role || "", e.contractType, e.startDate, e.endDate || "", String(e.monthlySalary ?? ""), e.isActive ? "oui" : "non"]);
        const csv = [header, ...rows].map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "employes.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const empFormFields = (f: Partial<Employee>, setF: (v: Partial<Employee>) => void) => (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Prénom"><input className={ic} value={f.firstName || ""} onChange={e => setF({ ...f, firstName: e.target.value })} /></Field>
                <Field label="Nom"><input className={ic} value={f.lastName || ""} onChange={e => setF({ ...f, lastName: e.target.value })} /></Field>
            </div>
            <Field label="Poste"><input className={ic} value={f.role || ""} onChange={e => setF({ ...f, role: e.target.value })} placeholder="Cuisinier, Serveur..." /></Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Type de contrat">
                    <FormSelect className={ic} value={f.contractType || "CDI"} onChange={e => setF({ ...f, contractType: e.target.value })}>
                        {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </FormSelect>
                </Field>
                <Field label="Date début"><input type="date" className={ic} value={f.startDate || ""} onChange={e => setF({ ...f, startDate: e.target.value })} style={{ colorScheme: "dark" }} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Date fin (opt.)"><input type="date" className={ic} value={f.endDate || ""} onChange={e => setF({ ...f, endDate: e.target.value || null })} style={{ colorScheme: "dark" }} /></Field>
                <Field label="Salaire mensuel (€)"><input type="number" step="0.01" className={ic} value={f.monthlySalary ?? ""} onChange={e => setF({ ...f, monthlySalary: e.target.value === "" ? null : safeFloat(e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Taux horaire (€)"><input type="number" step="0.01" className={ic} value={f.hourlyRate ?? ""} onChange={e => setF({ ...f, hourlyRate: e.target.value === "" ? null : safeFloat(e.target.value) })} /></Field>
                <Field label="Heures/semaine"><input type="number" step="0.5" className={ic} value={f.weeklyHours ?? ""} onChange={e => setF({ ...f, weeklyHours: e.target.value === "" ? null : safeFloat(e.target.value) })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Téléphone"><input className={ic} value={f.phone || ""} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
                <Field label="Email"><input type="email" className={ic} value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><input className={ic} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm text-white/60">
                <input type="checkbox" checked={f.isActive ?? true} onChange={e => setF({ ...f, isActive: e.target.checked })} className="rounded" /> Actif
            </label>
        </>
    );

    return (
        <div className="space-y-6">
            <PeriodFilter periodKey={pf.periodKey} setPeriod={pf.setPeriod} customFrom={pf.customFrom} setCustomFrom={pf.setCustomFrom} customTo={pf.customTo} setCustomTo={pf.setCustomTo} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Effectif actif" value={String(activeEmps.length)} icon={Users} color="blue"
                    warning={activeEmps.length === 0 ? "Aucun employé créé — cliquez + Ajouter un employé" : undefined} compact={compactCards} />
                <StatCard label="Fiches de paie" value={String(filteredPayrolls.length)} icon={Receipt} color="purple"
                    warning={filteredPayrolls.length === 0 && employees.length === 0 ? "Créez des employés puis ajoutez des fiches" : undefined} compact={compactCards} />
                <StatCard label="Absences en attente" value={String(pendingAbsences)} icon={AlertTriangle} color="red" compact={compactCards} />
                <StatCard label="Masse salariale/mois" value={totalMonthlySalary > 0 ? fmt(totalMonthlySalary) : "N/D"} icon={Briefcase} color="orange"
                    warning={activeEmps.length === 0 ? "Renseignez les employés pour calculer" : undefined} compact={compactCards} />
            </div>

            {filteredPayrolls.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-400" /> Synthèse financière
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 mb-1">Coût employeur</p>
                            <p className="text-base font-mono font-bold text-orange-400">{fmt(totalCoutEmployeur)}</p>
                            <p className="text-[9px] mt-0.5 text-white/25">brut + charges pat.{hasGlobalEstimate ? " ~" : ""}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 mb-1">Total brut</p>
                            <p className="text-base font-mono font-bold text-orange-400">{fmt(totalPayrollGross)}</p>
                            <p className="text-[9px] mt-0.5 text-white/25">moy/fiche: {fmt(avgGrossPerEmp)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 mb-1">Total net versé</p>
                            <p className="text-base font-mono font-bold text-green-400">{fmt(totalPayrollNet)}</p>
                            <p className="text-[9px] mt-0.5 text-white/25">écart: {fmt(totalPayrollGross - totalPayrollNet)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 mb-1">Charges salariales</p>
                            <p className="text-base font-mono font-bold text-red-400">{fmt(totalPayrollChargesSal)}</p>
                            <p className="text-[9px] mt-0.5 text-white/25">taux: {globalChargeRate}% du brut</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 mb-1">Rétention nette</p>
                            <p className="text-base font-mono font-bold text-blue-400">{totalPayrollGross > 0 ? (totalPayrollNet / totalPayrollGross * 100).toFixed(1) : "0"}%</p>
                            <p className="text-[9px] mt-0.5 text-white/25">net / brut</p>
                        </div>
                    </div>
                </div>
            )}

            {activeEmps.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-orange-400" /> Répartition des contrats</h3>
                    <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                        {CONTRACT_TYPES.map(ct => {
                            const count = activeEmps.filter(e => e.contractType === ct).length;
                            if (count === 0) return null;
                            const pct = (count / activeEmps.length) * 100;
                            const colors: Record<string, string> = { CDI: "bg-green-500", CDD: "bg-blue-500", Extra: "bg-orange-500", Stage: "bg-purple-500" };
                            return <div key={ct} className={`${colors[ct] || "bg-white/20"} h-full transition-all`} style={{ width: `${pct}%` }} title={`${ct}: ${count}`} />;
                        })}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-white/50">
                        {CONTRACT_TYPES.map(ct => {
                            const count = activeEmps.filter(e => e.contractType === ct).length;
                            if (count === 0) return null;
                            const colors: Record<string, string> = { CDI: "bg-green-500", CDD: "bg-blue-500", Extra: "bg-orange-500", Stage: "bg-purple-500" };
                            return <span key={ct} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${colors[ct]}`} /> {ct} ({count})</span>;
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 lg:col-span-2">
                    <Search className="w-4 h-4 text-white/40" />
                    <input value={rhSearch} onChange={e => setRhSearch(e.target.value)} placeholder="Rechercher nom, poste, email..." className="bg-transparent w-full text-sm focus:outline-none text-white" />
                </div>
                <FormSelect className={ic} value={contractFilter} onChange={e => setContractFilter(e.target.value)}>
                    <option value="all">Tous les contrats</option>
                    {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </FormSelect>
                <FormSelect className={ic} value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)}>
                    <option value="all">Tous</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                </FormSelect>
                <button onClick={exportRhCSV} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white whitespace-nowrap">Export CSV</button>
            </div>

            <Card title={`Employés (${filteredEmps.length})`} icon={Users}
                action={<button onClick={() => setShowEmpForm(true)} className={btnPrimary} data-testid="button-add-employee"><Plus className="w-4 h-4" /> Nouvel Employé</button>}>
                {filteredEmps.length === 0 ? (
                    <p className="text-white/40 text-center py-8">Aucun employé trouvé</p>
                ) : (
                    <div className="grid gap-3">
                        {filteredEmps.map(e => (
                            <EmployeeCard key={e.id} employee={e} dk={true} payrolls={payrolls}
                                onEdit={() => { setEditingEmpId(e.id); setEditEmpData({ firstName: e.firstName, lastName: e.lastName, role: e.role, contractType: e.contractType, startDate: e.startDate, endDate: e.endDate, monthlySalary: e.monthlySalary, hourlyRate: e.hourlyRate, weeklyHours: e.weeklyHours, isActive: e.isActive, phone: e.phone, email: e.email, notes: e.notes }); }}
                                onDelete={() => { if (confirm("Supprimer cet employé ?")) deleteEmpMut.mutate(e.id); }}
                                onFiles={() => setShowEmpFiles(showEmpFiles === e.id ? null : e.id)}
                                fileCount={empFiles.filter(f => f.linkedEntityId === e.id).length}
                            />
                        ))}
                    </div>
                )}
            </Card>

            <Card title={`Absences & Congés (${filteredAbsences.length})`} icon={Clock}
                action={<button onClick={() => setShowAbsenceForm(true)} className={btnPrimary} data-testid="button-add-absence"><Plus className="w-4 h-4" /> Déclarer Absence</button>}>
                {filteredAbsences.length === 0 ? (
                    <p className="text-white/40 text-center py-4">Aucune absence sur cette période</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/40 border-b border-white/10">
                                    <th className="text-left py-2 px-2">Employé</th>
                                    <th className="text-left py-2 px-2">Type</th>
                                    <th className="text-left py-2 px-2">Début</th>
                                    <th className="text-left py-2 px-2">Fin</th>
                                    <th className="text-center py-2 px-2">Durée</th>
                                    <th className="text-center py-2 px-2">Statut</th>
                                    <th className="text-right py-2 px-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAbsences.map(a => (
                                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-2">{empName(a.employeeId)}</td>
                                        <td className="py-2 px-2 text-white/60">{typeLabel[a.type] || a.type}</td>
                                        <td className="py-2 px-2 text-white/60">{fmtDate(a.startDate)}</td>
                                        <td className="py-2 px-2 text-white/60">{a.endDate ? fmtDate(a.endDate) : "-"}</td>
                                        <td className="py-2 px-2 text-center">{a.duration ? `${a.duration}j` : "-"}</td>
                                        <td className="py-2 px-2 text-center">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.isApproved ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                                {a.isApproved ? "Approuvé" : "En attente"}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <button onClick={() => { if (confirm("Supprimer cette absence ?")) deleteAbsMut.mutate(a.id); }} className={btnDanger} title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card title={`Fiches de Paie (${filteredPayrolls.length})`} icon={DollarSign}
                action={
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setShowPayrollImport(true)} className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center gap-1.5" data-testid="button-import-payroll">
                            <Upload className="w-4 h-4" /> Importer PDF
                        </button>
                        <button onClick={() => { reparseMut.mutate({}); toast({ title: "Re-parsing en cours..." }); }} disabled={reparseMut.isPending} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white flex items-center gap-1.5 disabled:opacity-40" data-testid="button-reparse-payroll">
                            <RefreshCw className={`w-4 h-4 ${reparseMut.isPending ? "animate-spin" : ""}`} /> Reparser
                        </button>
                        <button onClick={() => setShowPayrollForm(true)} className={btnPrimary} data-testid="button-add-payroll"><Plus className="w-4 h-4" /> Ajouter Fiche</button>
                    </div>
                }>
                {filteredPayrolls.length === 0 ? (
                    <p className="text-white/40 text-center py-4">Aucune fiche de paie sur cette période</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/40 border-b border-white/10">
                                    <th className="text-left py-2 px-2">Employé</th>
                                    <th className="text-left py-2 px-2">Période</th>
                                    <th className="text-right py-2 px-2">Brut</th>
                                    <th className="text-right py-2 px-2">Net</th>
                                    <th className="text-right py-2 px-2">Charges</th>
                                    <th className="text-right py-2 px-2">Primes</th>
                                    <th className="text-center py-2 px-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayrolls.map(p => (
                                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-2">{empName(p.employeeId)}</td>
                                        <td className="py-2 px-2 text-white/60">{p.period}</td>
                                        <td className="py-2 px-2 text-right font-mono">{fmt(p.grossSalary)}</td>
                                        <td className="py-2 px-2 text-right font-mono text-green-400">{fmt(p.netSalary)}</td>
                                        <td className="py-2 px-2 text-right font-mono text-red-400">{p.socialCharges ? fmt(p.socialCharges) : "-"}</td>
                                        <td className="py-2 px-2 text-right font-mono text-orange-400">{p.bonus ? fmt(p.bonus) : "-"}</td>
                                        <td className="py-2 px-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => setViewingPayroll(p)} className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition" title="Voir détails" data-testid={`button-view-payroll-${p.id}`}><Eye className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => { if (confirm("Supprimer cette fiche de paie ?")) deletePayMut.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition" title="Supprimer" data-testid={`button-delete-payroll-${p.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <FormModal title="Nouvel Employé" open={showEmpForm} onClose={() => setShowEmpForm(false)}>
                {empFormFields(empForm, setEmpForm)}
                <button onClick={() => {
                    if (!empForm.firstName || !empForm.lastName) return toast({ title: "Nom requis", variant: "destructive" });
                    createEmpMut.mutate(empForm);
                    setShowEmpForm(false);
                    setEmpForm({ contractType: "CDI", isActive: true, startDate: new Date().toISOString().substring(0, 10) });
                }} className={btnPrimary + " w-full justify-center"}><Check className="w-4 h-4" /> Enregistrer</button>
            </FormModal>

            <FormModal title="Modifier Employé" open={editingEmpId !== null} onClose={() => setEditingEmpId(null)}>
                {empFormFields(editEmpData, setEditEmpData)}
                <button onClick={() => {
                    if (editingEmpId) updateEmpMut.mutate({ id: editingEmpId, data: editEmpData });
                    setEditingEmpId(null);
                }} className={btnPrimary + " w-full justify-center"}><Check className="w-4 h-4" /> Mettre à jour</button>
            </FormModal>

            <FormModal title="Déclarer Absence" open={showAbsenceForm} onClose={() => setShowAbsenceForm(false)}>
                <Field label="Employé">
                    <FormSelect className={ic} value={absenceForm.employeeId || ""} onChange={e => setAbsenceForm(f => ({ ...f, employeeId: parseInt(e.target.value) }))}>
                        <option value="">Choisir un employé</option>
                        {(employees || []).filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </FormSelect>
                </Field>
                <Field label="Type">
                    <FormSelect className={ic} value={absenceForm.type || "conge"} onChange={e => setAbsenceForm(f => ({ ...f, type: e.target.value }))}>
                        {ABSENCE_TYPES.map(t => <option key={t} value={t}>{typeLabel[t] || t}</option>)}
                    </FormSelect>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Début"><input type="date" className={ic} value={absenceForm.startDate || ""} onChange={e => setAbsenceForm(f => ({ ...f, startDate: e.target.value }))} style={{ colorScheme: "dark" }} /></Field>
                    <Field label="Fin"><input type="date" className={ic} value={absenceForm.endDate || ""} onChange={e => setAbsenceForm(f => ({ ...f, endDate: e.target.value }))} style={{ colorScheme: "dark" }} /></Field>
                </div>
                <Field label="Durée (jours)"><input type="number" className={ic} value={absenceForm.duration ?? ""} onChange={e => setAbsenceForm(f => ({ ...f, duration: parseInt(e.target.value) || undefined }))} /></Field>
                <Field label="Raison"><input className={ic} value={absenceForm.reason || ""} onChange={e => setAbsenceForm(f => ({ ...f, reason: e.target.value }))} /></Field>
                <button onClick={() => {
                    if (!absenceForm.employeeId) return toast({ title: "Choisissez un employé", variant: "destructive" });
                    createAbsMut.mutate(absenceForm);
                    setShowAbsenceForm(false);
                    setAbsenceForm({ type: "conge", startDate: new Date().toISOString().substring(0, 10) });
                }} className={btnPrimary + " w-full justify-center"}><Check className="w-4 h-4" /> Enregistrer</button>
            </FormModal>

            <FormModal title="Ajouter Fiche de Paie" open={showPayrollForm} onClose={() => setShowPayrollForm(false)}>
                <Field label="Employé">
                    <FormSelect className={ic} value={payrollForm.employeeId || ""} onChange={e => setPayrollForm(f => ({ ...f, employeeId: parseInt(e.target.value) }))}>
                        <option value="">Choisir un employé</option>
                        {(employees || []).filter(e => e.isActive).map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </FormSelect>
                </Field>
                <Field label="Période"><input type="month" className={ic} value={payrollForm.period || ""} onChange={e => setPayrollForm(f => ({ ...f, period: e.target.value }))} style={{ colorScheme: "dark" }} /></Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Brut (€)"><input type="number" step="0.01" className={ic} value={payrollForm.grossSalary ?? ""} onChange={e => setPayrollForm(f => ({ ...f, grossSalary: safeFloat(e.target.value) }))} /></Field>
                    <Field label="Net (€)"><input type="number" step="0.01" className={ic} value={payrollForm.netSalary ?? ""} onChange={e => setPayrollForm(f => ({ ...f, netSalary: safeFloat(e.target.value) }))} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Charges salariales (€)"><input type="number" step="0.01" className={ic} value={payrollForm.socialCharges ?? ""} onChange={e => setPayrollForm(f => ({ ...f, socialCharges: safeFloat(e.target.value) }))} /></Field>
                    <Field label="Primes (€)"><input type="number" step="0.01" className={ic} value={payrollForm.bonus ?? ""} onChange={e => setPayrollForm(f => ({ ...f, bonus: safeFloat(e.target.value) }))} /></Field>
                </div>
                <button onClick={() => {
                    if (!payrollForm.employeeId || !payrollForm.grossSalary || !payrollForm.netSalary) return toast({ title: "Employé, brut et net requis", variant: "destructive" });
                    createPayMut.mutate(payrollForm);
                    setShowPayrollForm(false);
                    setPayrollForm({ period: new Date().toISOString().substring(0, 7) });
                }} className={btnPrimary + " w-full justify-center"}><Check className="w-4 h-4" /> Enregistrer</button>
            </FormModal>

            {viewingPayroll && (
                <FormModal title={`Fiche de Paie — ${empName(viewingPayroll.employeeId)} — ${viewingPayroll.period}`} open={true} onClose={() => setViewingPayroll(null)}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-white/40">Employé</span><p className="text-white font-medium">{empName(viewingPayroll.employeeId)}</p></div>
                        <div><span className="text-white/40">Période</span><p className="text-white">{viewingPayroll.period}</p></div>
                        <div><span className="text-white/40">Salaire brut</span><p className="font-mono text-white">{fmt(viewingPayroll.grossSalary)}</p></div>
                        <div><span className="text-white/40">Salaire net</span><p className="font-mono text-green-400">{fmt(viewingPayroll.netSalary)}</p></div>
                        <div><span className="text-white/40">Charges salariales</span><p className="font-mono text-red-400">{viewingPayroll.socialCharges ? fmt(viewingPayroll.socialCharges) : "-"}</p></div>
                        <div><span className="text-white/40">Primes</span><p className="font-mono text-orange-400">{viewingPayroll.bonus ? fmt(viewingPayroll.bonus) : "-"}</p></div>
                        {viewingPayroll.overtime != null && viewingPayroll.overtime > 0 && (
                            <div><span className="text-white/40">Heures sup.</span><p className="font-mono text-white">{viewingPayroll.overtime}h</p></div>
                        )}
                        {viewingPayroll.employerCharges != null && (
                            <div><span className="text-white/40">Charges patronales</span><p className="font-mono text-white">{fmt(viewingPayroll.employerCharges)}</p></div>
                        )}
                        {viewingPayroll.totalEmployerCost != null && (
                            <div><span className="text-white/40">Coût employeur total</span><p className="font-mono text-white">{fmt(viewingPayroll.totalEmployerCost)}</p></div>
                        )}
                    </div>
                </FormModal>
            )}

            <FormModal title="Importer Fiches de Paie (PDF)" open={showPayrollImport} onClose={() => { setShowPayrollImport(false); setPayrollImportFile(null); }}>
                <div className="space-y-4">
                    <p className="text-sm text-white/60">Importez un PDF contenant des bulletins de paie. Les données seront automatiquement extraites (noms, périodes, montants).</p>
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                        <input type="file" accept=".pdf" onChange={e => setPayrollImportFile(e.target.files?.[0] || null)} className="hidden" id="payroll-import-input" />
                        <label htmlFor="payroll-import-input" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                            <p className="text-sm text-white/50">{payrollImportFile ? payrollImportFile.name : "Cliquez ou déposez un PDF"}</p>
                            <p className="text-[10px] text-white/30 mt-1">Bulletins de paie PDF</p>
                        </label>
                    </div>
                    {importPayrollMut.isPending && <ImportProgressBar progress={60} label="Extraction en cours..." />}
                    <button
                        onClick={() => {
                            if (!payrollImportFile) return;
                            const fd = new FormData();
                            fd.append("file", payrollImportFile);
                            importPayrollMut.mutate(fd, {
                                onSuccess: () => { toast({ title: "Bulletins importés avec succès" }); setShowPayrollImport(false); setPayrollImportFile(null); },
                                onError: () => toast({ title: "Erreur d'import", variant: "destructive" }),
                            });
                        }}
                        disabled={!payrollImportFile || importPayrollMut.isPending}
                        className={btnPrimary + " w-full justify-center"}
                    >
                        <Upload className="w-4 h-4" /> Importer
                    </button>
                </div>
            </FormModal>

            {showEmpFiles !== null && (
                <FormModal title={`Dossier — ${empName(showEmpFiles)}`} open={true} onClose={() => setShowEmpFiles(null)}>
                    <div className="space-y-4">
                        <button onClick={() => setShowFileUpload(showEmpFiles)} className={btnPrimary + " w-full justify-center"}>
                            <Upload className="w-4 h-4" /> Ajouter un fichier
                        </button>
                        <CategoryFiles
                            files={empFiles.filter(f => f.linkedEntityId === showEmpFiles)}
                            onPreview={setPreviewFile}
                            onDelete={(id) => deleteFileMut.mutate(id)}
                        />
                    </div>
                </FormModal>
            )}

            {showFileUpload !== null && (
                <FileUploadModal
                    open={true}
                    onClose={() => setShowFileUpload(null)}
                    onUpload={(fd) => uploadFileMut.mutate(fd)}
                    linkedEntityType="employee"
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
