import { ShoppingCart, Landmark, CreditCard, Users, BarChart3, Plus, Check, TrendingUp, UserCheck, AlertTriangle, Loader2, Gauge, Banknote, ShieldAlert, FileText, HardDrive, Download, FolderOpen } from "lucide-react";
import { AuditOverview, Employee, CashEntry, SuguBackup, fmt, fmtEur, fmtDateShort, fmtFileSize, fmtDate } from "./types";
import { StatCard, CardSizeToggle, PeriodFilter, usePeriodFilter } from "./shared";

interface DashboardTabProps {
    tenantId: string;
    onNavigate: (tab: string) => void;
    onOpenNewCaisse: () => void;
    compactCards: boolean;
    setCompactCards: (v: boolean) => void;
    audit: AuditOverview | null | undefined;
    auditLoading: boolean;
    employees: Employee[];
    cashEntries: CashEntry[];
    fileStats: any;
    backups: SuguBackup[];
    createBackupMut: any;
}

export function DashboardTab({ tenantId, onNavigate, onOpenNewCaisse, compactCards, setCompactCards, audit, auditLoading, employees, cashEntries, fileStats, backups, createBackupMut }: DashboardTabProps) {
    const pf = usePeriodFilter("year");
    const year = pf.period.year;

    const loading = auditLoading;
    const activeEmps = employees.filter(e => e.isActive);

    const filteredCashEntries = cashEntries.filter(e => e.entryDate >= pf.period.from && e.entryDate <= pf.period.to);
    const periodCA = filteredCashEntries.reduce((s, e) => s + (e.totalRevenue || 0), 0);

    const last7Cash = [...filteredCashEntries].sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 7).reverse();
    const maxCash = Math.max(...last7Cash.map(c => c.totalRevenue), 1);

    const healthScore = audit ? Math.min(100, Math.max(0,
        50
        + (parseFloat(audit.profitMargin) > 0 ? 20 : -10)
        + (audit.unpaidPurchases < 1000 ? 10 : -5)
        + (audit.unpaidExpenses < 500 ? 10 : -5)
    )) : 0;

    const healthColor = healthScore >= 70 ? "text-green-400" : healthScore >= 40 ? "text-yellow-400" : "text-red-400";
    const healthBg = healthScore >= 70 ? "from-green-500/20 to-green-600/10 border-green-500/20" : healthScore >= 40 ? "from-yellow-500/20 to-yellow-600/10 border-yellow-500/20" : "from-red-500/20 to-red-600/10 border-red-500/20";

    const now = new Date();
    const curM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevM = `${prevMDate.getFullYear()}-${String(prevMDate.getMonth() + 1).padStart(2, "0")}`;
    const curMCA = filteredCashEntries.filter(e => e.entryDate.startsWith(curM)).reduce((s, e) => s + e.totalRevenue, 0);
    const prevMCA = filteredCashEntries.filter(e => e.entryDate.startsWith(prevM)).reduce((s, e) => s + e.totalRevenue, 0);
    const caTrend = prevMCA > 0 ? { pct: ((curMCA - prevMCA) / prevMCA * 100).toFixed(1), favorable: curMCA >= prevMCA, dir: (curMCA >= prevMCA ? "up" : "down") as "up" | "down" } : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-white/50">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Chargement du Dashboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full min-w-0">
            <div className={`bg-gradient-to-r from-orange-500/10 via-red-500/5 to-slate-900/50 border border-orange-500/20 rounded-2xl transition-all ${compactCards ? "p-2 sm:p-3" : "p-4 sm:p-6"}`}>
                <div className="flex flex-row items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="min-w-0">
                            <h2 className={`font-bold text-white leading-tight truncate transition-all ${compactCards ? "text-sm sm:text-base" : "text-lg sm:text-2xl"}`}>MyBusiness Synthèse</h2>
                            {!compactCards && (
                                <p className="text-xs sm:text-sm text-white/50">Vue d'ensemble {pf.period.label} • Mise à jour en temps réel</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <PeriodFilter periodKey={pf.periodKey} setPeriod={pf.setPeriod} customFrom={pf.customFrom} setCustomFrom={pf.setCustomFrom} customTo={pf.customTo} setCustomTo={pf.setCustomTo} />
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/40">Indicateurs clés</span>
                <CardSizeToggle compact={compactCards} setCompact={setCompactCards} />
            </div>
            <div className={`grid ${compactCards ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"} gap-3`}>
                {compactCards ? (
                    <div className={`bg-gradient-to-br ${healthBg} border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer hover:opacity-90 transition`} onClick={() => onNavigate("achats")}>
                        <Gauge className="w-4 h-4 flex-shrink-0 text-white/60" />
                        <div className="flex flex-col min-w-0">
                            <p className={`text-sm font-bold ${healthColor} truncate`}>{healthScore}</p>
                            <p className="text-[9px] text-white/50 truncate">Score Santé</p>
                        </div>
                        <span className={`text-[9px] font-bold ${healthColor} ml-auto flex-shrink-0`}>
                            {healthScore >= 70 ? "BON" : healthScore >= 40 ? "MOYEN" : "ALERTE"}
                        </span>
                    </div>
                ) : (
                    <div className={`bg-gradient-to-br ${healthBg} border rounded-lg px-3 py-2 cursor-pointer hover:opacity-90 transition`} onClick={() => onNavigate("achats")}>
                        <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 flex-shrink-0 text-white/60" />
                            <p className={`text-sm font-bold ${healthColor} flex-1 truncate`}>{healthScore}</p>
                            <span className={`text-[10px] font-bold ${healthColor} flex-shrink-0`}>
                                {healthScore >= 70 ? "BON" : healthScore >= 40 ? "MOYEN" : "ALERTE"}
                            </span>
                        </div>
                        <p className="text-[10px] text-white/50 mt-0.5 truncate">Score Santé</p>
                    </div>
                )}

                <StatCard label={`CA ${pf.period.label}`} value={fmtEur(periodCA)} icon={TrendingUp} color="green" trendData={caTrend} compact={compactCards} />
                <StatCard label="Marge opérat." value={audit ? `${audit.profitMargin}%` : "-"} icon={BarChart3}
                    color={audit && parseFloat(audit.profitMargin) > 0 ? "green" : "red"}
                    trendData={audit && parseFloat(audit.profitMargin) > 0 ? { pct: audit.profitMargin, favorable: true, dir: "up" } : null}
                    warning={audit && audit.totalRevenue > 0 && audit.totalCosts < audit.totalRevenue * 0.1 ? "Données de coûts incomplètes" : undefined}
                    compact={compactCards} />
                <StatCard label="Jours de caisse" value={String(filteredCashEntries.length)} icon={CreditCard} color="orange" compact={compactCards} />
                <StatCard label="Employés actifs" value={String(activeEmps.length)} icon={UserCheck} color="purple"
                    warning={activeEmps.length === 0 ? "Aucun employé créé dans le module RH" : undefined}
                    compact={compactCards} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => onNavigate("achats")} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition shadow-sm" data-testid="action-add-purchase">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500"><Plus className="w-5 h-5" /></div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-white">Ajout Achat / Frais</p>
                        <p className="text-[10px] text-white/40">Documents & archives</p>
                    </div>
                </button>
                <button onClick={onOpenNewCaisse} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition shadow-sm" data-testid="action-add-caisse">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500"><CreditCard className="w-5 h-5" /></div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-white">Saisir caisse</p>
                        <p className="text-[10px] text-white/40">CA quotidien</p>
                    </div>
                </button>
                <button onClick={() => onNavigate("banque")} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition shadow-sm" data-testid="action-view-bank">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500"><Landmark className="w-5 h-5" /></div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-white">Voir banque</p>
                        <p className="text-[10px] text-white/40">Écritures & emprunts</p>
                    </div>
                </button>
                <button onClick={() => onNavigate("rh")} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition shadow-sm" data-testid="action-view-rh">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500"><Users className="w-5 h-5" /></div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-white">Gestion RH</p>
                        <p className="text-[10px] text-white/40">Employés & paie</p>
                    </div>
                </button>
            </div>
            <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 min-w-0">
                        <Landmark className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <h3 className="font-semibold text-white truncate">Synthèse Financière</h3>
                    </div>
                    {audit ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                {(() => {
                                    const allCosts = (audit.costBreakdown.achats || 0) + (audit.costBreakdown.fraisGeneraux || 0) + (audit.costBreakdown.salaires || 0) + (audit.costBreakdown.chargesSociales || 0) + (audit.costBreakdown.emprunts || 0);
                                    const denominator = audit.totalRevenue > 0 ? audit.totalRevenue : allCosts;
                                    return [
                                        { label: "Achats", value: audit.costBreakdown.achats, color: "bg-orange-500" },
                                        { label: "Frais Généraux", value: audit.costBreakdown.fraisGeneraux, color: "bg-blue-500" },
                                        { label: "Salaires", value: audit.costBreakdown.salaires, color: "bg-purple-500" },
                                        { label: "Charges Sociales", value: audit.costBreakdown.chargesSociales, color: "bg-pink-500" },
                                        { label: "Emprunts", value: audit.costBreakdown.emprunts, color: "bg-red-500" },
                                    ].map(item => {
                                        const pct = denominator > 0 ? (item.value / denominator) * 100 : 0;
                                        return (
                                            <div key={item.label} className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs text-white/50 w-24 sm:w-28 flex-shrink-0 truncate">{item.label}</span>
                                                <div className="flex-1 min-w-0 bg-white/5 rounded-full h-2">
                                                    <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, pct).toFixed(1)}%` }} />
                                                </div>
                                                <span className="text-xs text-white/70 w-20 sm:w-24 text-right flex-shrink-0 tabular-nums">{fmtEur(item.value)}</span>
                                                <span className="text-xs text-white/40 w-12 text-right flex-shrink-0 tabular-nums">{pct.toFixed(1)}%</span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                                <div>
                                    <p className="text-xs text-white/40">Impayés fourn.</p>
                                    <p className="font-bold text-white text-[14px]">{fmtEur(audit.unpaidPurchases)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/40">Impayés frais</p>
                                    <p className="font-bold text-white text-[14px]">{fmtEur(audit.unpaidExpenses)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/40">Capital emprunts</p>
                                    <p className="font-bold text-white text-[14px]">{fmtEur(audit.totalRemainingLoans)}</p>
                                </div>
                            </div>
                            {audit.topSuppliers && audit.topSuppliers.length > 0 && (
                                <div className="pt-3 border-t border-white/10">
                                    <p className="text-xs text-white/40 mb-2">Top 5 Fournisseurs (Année)</p>
                                    <div className="space-y-1.5">
                                        {audit.topSuppliers.slice(0, 5).map((s, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <span className="text-white/70 truncate max-w-[150px]">{s.name}</span>
                                                <span className="font-mono text-white/50">{fmtEur(s.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {last7Cash.length > 0 && (
                                <div className="pt-3 border-t border-white/10">
                                    <p className="text-xs text-white/40 mb-2">CA 7 derniers jours (caisse)</p>
                                    <div className="flex items-end gap-1 h-16">
                                        {last7Cash.map((c, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                <div className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t min-h-[4px]" style={{ height: `${Math.round(c.totalRevenue / maxCash * 100)}%` }} />
                                                <span className="text-[9px] text-white/30">{fmtDateShort(c.entryDate)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-white/40">Aucune donnée financière pour {year}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-400" /> Fichiers & Stockage
                    </h3>
                    {fileStats ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-white/40 mb-1">Fichiers</p>
                                <p className="text-lg font-mono font-bold text-blue-400">{fileStats.totalFiles || 0}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-white/40 mb-1">Stockage</p>
                                <p className="text-lg font-mono font-bold text-green-400">{fmtFileSize(fileStats.totalSize || 0)}</p>
                            </div>
                            {fileStats.categories && Object.entries(fileStats.categories).map(([cat, count]: [string, any]) => (
                                <div key={cat} className="bg-white/5 rounded-xl p-2 text-center">
                                    <p className="text-[9px] text-white/40">{cat}</p>
                                    <p className="text-sm font-mono text-white">{count}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-white/40">Chargement...</p>
                    )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-green-400" /> Sauvegardes
                    </h3>
                    <button
                        onClick={() => createBackupMut.mutate({})}
                        disabled={createBackupMut.isPending}
                        className="mb-3 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        data-testid="button-create-backup"
                    >
                        <Download className="w-4 h-4" />
                        {createBackupMut.isPending ? "Création..." : "Nouvelle sauvegarde"}
                    </button>
                    {backups.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {backups.slice(0, 5).map((b, i) => (
                                <div key={b.id || i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
                                    <div>
                                        <p className="text-white font-medium">{b.label || `Sauvegarde #${b.id}`}</p>
                                        <p className="text-white/40">{b.createdAt ? fmtDate(b.createdAt) : "—"} • {b.size ? fmtFileSize(b.size) : ""}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${b.status === "completed" ? "bg-green-500/20 text-green-400" : b.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                        {b.status === "completed" ? "OK" : b.status === "failed" ? "Échoué" : "En cours"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-white/40">Aucune sauvegarde</p>
                    )}
                </div>
            </div>
        </div>
    );
}
