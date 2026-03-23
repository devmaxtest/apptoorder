import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, X, Maximize2, Minimize2, CalendarRange, Upload, FileText, Image as ImageIcon, Download, Trash2, Send, Eye, FolderOpen } from "lucide-react";
import { normalizeCatKey, type SuguFile, FILE_CATEGORIES, fmtFileSize, fmtDate } from "./types";

export function useSuguDark() { return true; }

export type PeriodKey = "all" | "year" | "quarter" | "last_month" | "month" | "custom";

export interface PeriodDates {
  from: string;
  to: string;
  year: string;
  label: string;
  key: PeriodKey;
}

function pad2(n: number) { return n.toString().padStart(2, "0"); }

export function computePeriodDates(key: PeriodKey, customFrom?: string, customTo?: string): PeriodDates {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "all":
      return { from: "2024-01-01", to: `${y}-12-31`, year: `${y}`, label: "Depuis le début", key };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31`, year: `${y}`, label: `Année ${y}`, key };
    case "quarter": {
      const qStartMonth = m - (m % 3);
      const qStart = new Date(y, qStartMonth, 1);
      const qEnd = new Date(y, qStartMonth + 3, 0);
      const qNum = Math.floor(m / 3) + 1;
      return { from: `${qStart.getFullYear()}-${pad2(qStart.getMonth() + 1)}-01`, to: `${qEnd.getFullYear()}-${pad2(qEnd.getMonth() + 1)}-${pad2(qEnd.getDate())}`, year: `${qStart.getFullYear()}`, label: `T${qNum} ${y}`, key };
    }
    case "last_month": {
      const lm = new Date(y, m - 1, 1);
      const lmEnd = new Date(y, m, 0);
      return { from: `${lm.getFullYear()}-${pad2(lm.getMonth() + 1)}-01`, to: `${lmEnd.getFullYear()}-${pad2(lmEnd.getMonth() + 1)}-${pad2(lmEnd.getDate())}`, year: `${lm.getFullYear()}`, label: new Date(lm).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), key };
    }
    case "month":
      return { from: `${y}-${pad2(m + 1)}-01`, to: `${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`, year: `${y}`, label: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), key };
    case "custom":
      return { from: customFrom || `${y}-${pad2(m + 1)}-01`, to: customTo || `${y}-${pad2(m + 1)}-${pad2(new Date(y, m + 1, 0).getDate())}`, year: (customFrom || `${y}`).slice(0, 4), label: "Personnalisé", key };
  }
}

export function usePeriodFilter(defaultKey: PeriodKey = "all") {
  const [periodKey, setPeriodKey] = useState<PeriodKey>(defaultKey);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const period = useMemo(() => computePeriodDates(periodKey, customFrom, customTo), [periodKey, customFrom, customTo]);
  const setPeriod = useCallback((k: PeriodKey) => setPeriodKey(k), []);
  return { period, periodKey, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo };
}

export function PeriodFilter({ periodKey, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }: {
  periodKey: PeriodKey;
  setPeriod: (k: PeriodKey) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  const dk = true;
  const tabs: { key: PeriodKey; label: string; icon?: boolean }[] = [
    { key: "all", label: "Tout" },
    { key: "year", label: "Année" },
    { key: "quarter", label: "Trimestre" },
    { key: "last_month", label: "Mois dernier" },
    { key: "month", label: "Mois en cours" },
    { key: "custom", label: "", icon: true },
  ];
  const active = (k: PeriodKey) => periodKey === k
    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
    : "bg-white/5 text-white/60 hover:bg-white/10";

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="period-filter">
      {tabs.map(t => (
        <button
          key={t.key}
          data-testid={`btn-period-${t.key}`}
          onClick={() => setPeriod(t.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active(t.key)}`}
        >
          {t.icon ? <CalendarRange className="w-3.5 h-3.5" /> : t.label}
        </button>
      ))}
      {periodKey === "custom" && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1 rounded-lg border text-xs bg-[#1e293b] border-white/10 text-white" data-testid="input-period-from" />
          <span className="text-xs text-white/40">→</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1 rounded-lg border text-xs bg-[#1e293b] border-white/10 text-white" data-testid="input-period-to" />
        </div>
      )}
    </div>
  );
}

export const categoryLabels: Record<string, { label: string; color: string }> = {
    encaissement_cb: { label: "CB", color: "bg-green-500/20 text-green-400" },
    plateforme: { label: "Plateforme", color: "bg-blue-500/20 text-blue-400" },
    encaissement_especes: { label: "Espèces +", color: "bg-emerald-500/20 text-emerald-400" },
    encaissement_virement: { label: "Virement +", color: "bg-emerald-500/20 text-emerald-400" },
    virement_recu: { label: "Virement +", color: "bg-emerald-500/20 text-emerald-400" },
    achat_fournisseur: { label: "Fournisseur", color: "bg-orange-500/20 text-orange-400" },
    remboursement_fournisseur: { label: "Rembt Fourn.", color: "bg-lime-500/20 text-lime-400" },
    commission_plateforme: { label: "Com. Plateforme", color: "bg-rose-500/20 text-rose-400" },
    loyer: { label: "Loyer", color: "bg-purple-500/20 text-purple-400" },
    salaire: { label: "Salaire", color: "bg-pink-500/20 text-pink-400" },
    virement_interne: { label: "Vir. interne", color: "bg-slate-500/20 text-slate-400" },
    virement_emis: { label: "Virement -", color: "bg-red-500/20 text-red-400" },
    frais_bancaires: { label: "Frais banque", color: "bg-yellow-500/20 text-yellow-400" },
    assurance: { label: "Assurance", color: "bg-cyan-500/20 text-cyan-400" },
    emprunt: { label: "Emprunt", color: "bg-violet-500/20 text-violet-400" },
    leasing: { label: "Leasing", color: "bg-violet-500/20 text-violet-400" },
    energie: { label: "Énergie", color: "bg-amber-500/20 text-amber-400" },
    carburant: { label: "Carburant", color: "bg-amber-500/20 text-amber-400" },
    telecom: { label: "Télécom", color: "bg-sky-500/20 text-sky-400" },
    charges_sociales: { label: "Charges", color: "bg-rose-500/20 text-rose-400" },
    vehicule: { label: "Véhicule", color: "bg-lime-500/20 text-lime-400" },
    equipement: { label: "Équipement", color: "bg-teal-500/20 text-teal-400" },
    prelevement: { label: "Prélèvement", color: "bg-stone-500/20 text-stone-400" },
    credit_divers: { label: "Divers +", color: "bg-gray-500/20 text-gray-400" },
    debit_divers: { label: "Divers -", color: "bg-gray-500/20 text-gray-400" },
    divers: { label: "Divers", color: "bg-gray-500/20 text-gray-400" },
    alimentaire: { label: "Alimentaire", color: "bg-orange-500/20 text-orange-400" },
    boissons: { label: "Boissons", color: "bg-blue-500/20 text-blue-400" },
    emballages: { label: "Emballages", color: "bg-yellow-500/20 text-yellow-400" },
    entretien: { label: "Entretien", color: "bg-cyan-500/20 text-cyan-400" },
    produits_entretien: { label: "Entretien", color: "bg-cyan-500/20 text-cyan-400" },
    comptabilite: { label: "Comptabilité", color: "bg-indigo-500/20 text-indigo-400" },
    assurances: { label: "Assurances", color: "bg-cyan-500/20 text-cyan-400" },
    vehicules: { label: "Véhicules", color: "bg-lime-500/20 text-lime-400" },
    plateformes: { label: "Plateformes", color: "bg-blue-500/20 text-blue-400" },
    materiels: { label: "Matériels", color: "bg-teal-500/20 text-teal-400" },
    eau: { label: "Eau", color: "bg-sky-500/20 text-sky-400" },
    travaux: { label: "Travaux", color: "bg-red-500/20 text-red-400" },
    autre: { label: "Autre", color: "bg-gray-500/20 text-gray-400" },
    loyer_fg: { label: "Loyer", color: "bg-purple-500/20 text-purple-400" },
};

export function CategoryBadge({ cat }: { cat?: string | null }) {
    if (!cat) return <span className="text-white/30 text-xs">—</span>;
    const key = normalizeCatKey(cat);
    const info = categoryLabels[key] || { label: cat, color: "bg-white/10 text-white/60" };
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${info.color}`}>{info.label}</span>;
}

export const inputClass = "w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50";
export const selectClass = inputClass;
export const btnPrimary = "bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-2";
export const btnDanger = "bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/30 transition";

export function useInputClass() {
    return "w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50";
}

export function Card({ title, icon: Icon, children, action, cardId, defaultCollapsed }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode; cardId?: string; defaultCollapsed?: boolean }) {
    const storageKey = useMemo(() => {
        const raw = cardId || title;
        return raw ? `sugu-card-${raw.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : null;
    }, [cardId, title]);

    const [collapsed, setCollapsed] = useState(() => {
        if (!storageKey || typeof window === "undefined") return defaultCollapsed ?? false;
        const saved = localStorage.getItem(storageKey);
        if (saved === "collapsed") return true;
        if (saved === "expanded") return false;
        return defaultCollapsed ?? false;
    });

    useEffect(() => {
        if (!storageKey || typeof window === "undefined") return;
        localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded");
    }, [collapsed, storageKey]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-orange-500" />
                    <h2 className="font-semibold text-white">{title}</h2>
                </div>
                <div className="flex items-center gap-2">
                    {action}
                    <button
                        onClick={() => setCollapsed(v => !v)}
                        className="p-2 rounded-lg transition hover:bg-white/10"
                        title={collapsed ? "Agrandir la carte" : "Réduire la carte"}
                        aria-label={collapsed ? "Agrandir la carte" : "Réduire la carte"}
                    >
                        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            {!collapsed && <div className="p-5">{children}</div>}
        </div>
    );
}

export function StatCard({ label, value, icon: Icon, trendData, color = "orange", compact, warning }: { label: string; value: string; icon: any; trendData?: { pct: string, favorable: boolean, dir: "up" | "down" } | null; color?: string; compact?: boolean; warning?: string }) {
    const darkMap: Record<string, string> = {
        orange: "from-orange-500/20 to-orange-600/10 border-orange-500/20",
        green: "from-green-500/20 to-green-600/10 border-green-500/20",
        red: "from-red-500/20 to-red-600/10 border-red-500/20",
        blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
        purple: "from-purple-500/20 to-purple-600/10 border-purple-500/20",
    };
    const iconDkMap: Record<string, string> = { orange: "text-orange-400", green: "text-green-400", red: "text-red-400", blue: "text-blue-400", purple: "text-purple-400" };

    const TrendBadge = ({ trend }: { trend: { pct: string, favorable: boolean, dir: "up" | "down" } }) => (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${trend.favorable ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {trend.dir === "up" ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {trend.pct}%
        </span>
    );

    if (compact) {
        return (
            <div className={`bg-gradient-to-br ${darkMap[color] || darkMap.orange} border rounded-lg px-3 py-2 flex items-center gap-2`} title={warning || undefined}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${iconDkMap[color] || "text-white/60"}`} />
                <div className="flex flex-col min-w-0">
                    <p className="text-sm font-bold text-white truncate">{value}</p>
                    <p className="text-[9px] text-white/50 truncate">{label}</p>
                </div>
                {warning && <span className="ml-auto text-amber-400 text-xs flex-shrink-0" title={warning}>⚠</span>}
                {!warning && trendData && <div className="ml-auto flex-shrink-0"><TrendBadge trend={trendData} /></div>}
            </div>
        );
    }

    return (
        <div className={`bg-gradient-to-br ${darkMap[color] || darkMap.orange} border rounded-lg px-3 py-2`}>
            <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 flex-shrink-0 ${iconDkMap[color] || "text-white/60"}`} />
                <p className="text-sm font-bold text-white truncate flex-1">{value}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {warning && <span className="text-amber-400 text-xs" title={warning}>⚠</span>}
                    {trendData && <TrendBadge trend={trendData} />}
                </div>
            </div>
            <p className="text-[10px] mt-0.5 text-white/50 truncate">{label}</p>
        </div>
    );
}

export function FormModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border-white/10 border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10" title="Fermer"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">{children}</div>
            </div>
        </div>
    );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-sm mb-1 text-white/60">{label}</span>
            {children}
        </label>
    );
}

export function FormSelect({ className, ...props }: JSX.IntrinsicElements["select"]) {
    return <select className={className} style={{ colorScheme: "dark" }} {...props} />;
}

export function CardSizeToggle({ compact, setCompact }: { compact: boolean; setCompact: (v: boolean) => void }) {
    return (
        <button
            onClick={() => setCompact(!compact)}
            className="p-1.5 rounded-lg transition hover:bg-white/10 text-white/50 hover:text-white/80"
            title={compact ? "Agrandir les cartes" : "Réduire les cartes"}
            data-testid="button-toggle-card-size"
        >
            {compact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
    );
}

export function FilePreviewModal({ file, open, onClose, onDelete, onEmail }: {
    file: SuguFile | null; open: boolean; onClose: () => void;
    onDelete?: (id: number) => void; onEmail?: (file: SuguFile) => void;
}) {
    if (!open || !file) return null;
    const isImage = file.mimeType?.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border-white/10 border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="text-white font-medium truncate">{file.originalName}</span>
                        <span className="text-white/40 text-xs flex-shrink-0">{fmtFileSize(file.size)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {file.url && (
                            <a href={file.url} download={file.originalName} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Télécharger" data-testid="btn-file-download">
                                <Download className="w-4 h-4" />
                            </a>
                        )}
                        {onEmail && (
                            <button onClick={() => onEmail(file)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Envoyer par email" data-testid="btn-file-email">
                                <Send className="w-4 h-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={() => { onDelete(file.id); onClose(); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400" title="Supprimer" data-testid="btn-file-delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60" title="Fermer" data-testid="btn-file-preview-close">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
                    {isImage && file.url ? (
                        <img src={file.url} alt={file.originalName} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                    ) : isPdf && file.url ? (
                        <iframe src={file.url} className="w-full h-[70vh] rounded-lg bg-white" title={file.originalName} />
                    ) : (
                        <div className="text-center text-white/40">
                            <FileText className="w-16 h-16 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">{file.originalName}</p>
                            <p className="text-xs mt-1">{file.mimeType} · {fmtFileSize(file.size)}</p>
                            {file.url && (
                                <a href={file.url} download={file.originalName} className="inline-flex items-center gap-1 mt-3 text-orange-400 text-sm hover:underline">
                                    <Download className="w-3.5 h-3.5" /> Télécharger
                                </a>
                            )}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-white/10 flex items-center gap-4 text-xs text-white/40">
                    <span>Catégorie : {file.category || "—"}</span>
                    <span>Ajouté le {fmtDate(file.uploadedAt)}</span>
                    {file.description && <span className="truncate">Note : {file.description}</span>}
                </div>
            </div>
        </div>
    );
}

export function FileUploadModal({ open, onClose, onUpload, linkedEntityType, linkedEntityId, isPending }: {
    open: boolean; onClose: () => void;
    onUpload: (formData: FormData) => void;
    linkedEntityType?: string; linkedEntityId?: number;
    isPending?: boolean;
}) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [category, setCategory] = useState("facture");
    const [description, setDescription] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    const handleFiles = (files: FileList | null) => {
        if (files) setSelectedFiles(Array.from(files));
    };

    const handleSubmit = () => {
        if (selectedFiles.length === 0) return;
        selectedFiles.forEach(file => {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("category", category);
            if (description) fd.append("description", description);
            if (linkedEntityType) fd.append("linkedEntityType", linkedEntityType);
            if (linkedEntityId) fd.append("linkedEntityId", String(linkedEntityId));
            onUpload(fd);
        });
        setSelectedFiles([]);
        setDescription("");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border-white/10 border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-white">Importer un fichier</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10" data-testid="btn-upload-close"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragOver ? "border-orange-500 bg-orange-500/10" : "border-white/20 hover:border-white/40"}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="drop-zone-upload"
                    >
                        <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
                        <p className="text-sm text-white/60">Glissez-déposez ou cliquez pour choisir</p>
                        <p className="text-xs text-white/30 mt-1">PDF, images, documents</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={e => handleFiles(e.target.files)}
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv"
                            data-testid="input-file-upload"
                        />
                    </div>
                    {selectedFiles.length > 0 && (
                        <div className="space-y-1">
                            {selectedFiles.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-white/70 bg-white/5 rounded-lg px-3 py-1.5">
                                    <FileText className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                    <span className="truncate flex-1">{f.name}</span>
                                    <span className="text-white/30 text-xs">{fmtFileSize(f.size)}</span>
                                    <button onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <Field label="Catégorie">
                        <FormSelect className={selectClass} value={category} onChange={e => setCategory(e.target.value)} data-testid="select-file-category">
                            {FILE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/^\w/, l => l.toUpperCase())}</option>)}
                        </FormSelect>
                    </Field>
                    <Field label="Description (optionnel)">
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="Note facultative..." data-testid="input-file-description" />
                    </Field>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedFiles.length === 0 || isPending}
                        className={`w-full ${btnPrimary} justify-center ${selectedFiles.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid="btn-upload-submit"
                    >
                        <Upload className="w-4 h-4" />
                        {isPending ? "Envoi en cours..." : `Importer ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SendEmailModal({ file, open, onClose, onSend, isPending }: {
    file: SuguFile | null; open: boolean; onClose: () => void;
    onSend: (data: { fileId: number; to: string; subject: string; body: string }) => void;
    isPending?: boolean;
}) {
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    useEffect(() => {
        if (file) {
            setSubject(`Document : ${file.originalName}`);
            setBody(`Veuillez trouver ci-joint le document "${file.originalName}".`);
        }
    }, [file]);

    if (!open || !file) return null;

    const handleSubmit = () => {
        if (!to) return;
        onSend({ fileId: file.id, to, subject, body });
        setTo(""); setSubject(""); setBody("");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border-white/10 border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-white">Envoyer par email</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10" data-testid="btn-email-close"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-white/70 truncate">{file.originalName}</span>
                    </div>
                    <Field label="Destinataire *">
                        <input type="email" value={to} onChange={e => setTo(e.target.value)} className={inputClass} placeholder="email@exemple.com" data-testid="input-email-to" />
                    </Field>
                    <Field label="Objet">
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={inputClass} data-testid="input-email-subject" />
                    </Field>
                    <Field label="Message">
                        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className={inputClass} data-testid="input-email-body" />
                    </Field>
                    <button
                        onClick={handleSubmit}
                        disabled={!to || isPending}
                        className={`w-full ${btnPrimary} justify-center ${!to ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid="btn-email-send"
                    >
                        <Send className="w-4 h-4" />
                        {isPending ? "Envoi..." : "Envoyer"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CategoryFiles({ files, onPreview, onDelete, onUpload, onEmail }: {
    files: SuguFile[];
    onPreview?: (file: SuguFile) => void;
    onDelete?: (id: number) => void;
    onUpload?: () => void;
    onEmail?: (file: SuguFile) => void;
}) {
    const grouped = useMemo(() => {
        const map: Record<string, SuguFile[]> = {};
        files.forEach(f => {
            const cat = f.category || "autre";
            if (!map[cat]) map[cat] = [];
            map[cat].push(f);
        });
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [files]);

    if (files.length === 0) {
        return (
            <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 text-white/20" />
                <p className="text-sm text-white/40">Aucun fichier</p>
                {onUpload && (
                    <button onClick={onUpload} className="mt-3 text-orange-400 text-sm hover:underline flex items-center gap-1 mx-auto" data-testid="btn-category-files-upload">
                        <Upload className="w-3.5 h-3.5" /> Importer un fichier
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{files.length} fichier{files.length > 1 ? "s" : ""}</span>
                {onUpload && (
                    <button onClick={onUpload} className="text-orange-400 text-xs hover:underline flex items-center gap-1" data-testid="btn-category-files-add">
                        <Upload className="w-3 h-3" /> Ajouter
                    </button>
                )}
            </div>
            {grouped.map(([cat, catFiles]) => (
                <div key={cat}>
                    <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">{cat.replace(/_/g, " ")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {catFiles.map(file => (
                            <div key={file.id} className="bg-white/5 border border-white/10 rounded-lg p-2 group hover:border-orange-500/30 transition">
                                <div className="aspect-[4/3] rounded-md overflow-hidden mb-1.5 bg-slate-800 flex items-center justify-center cursor-pointer" onClick={() => onPreview?.(file)}>
                                    {file.mimeType?.startsWith("image/") && file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.originalName} className="w-full h-full object-cover" />
                                    ) : (
                                        <FileText className="w-8 h-8 text-white/20" />
                                    )}
                                </div>
                                <p className="text-xs text-white/70 truncate" title={file.originalName}>{file.originalName}</p>
                                <p className="text-[10px] text-white/30">{fmtFileSize(file.size)}</p>
                                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => onPreview?.(file)} className="p-1 rounded hover:bg-white/10 text-white/50" title="Voir" data-testid={`btn-preview-file-${file.id}`}>
                                        <Eye className="w-3 h-3" />
                                    </button>
                                    {file.url && (
                                        <a href={file.url} download={file.originalName} className="p-1 rounded hover:bg-white/10 text-white/50" title="Télécharger" data-testid={`btn-download-file-${file.id}`}>
                                            <Download className="w-3 h-3" />
                                        </a>
                                    )}
                                    {onEmail && (
                                        <button onClick={() => onEmail(file)} className="p-1 rounded hover:bg-white/10 text-white/50" title="Email" data-testid={`btn-email-file-${file.id}`}>
                                            <Send className="w-3 h-3" />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button onClick={() => onDelete(file.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Supprimer" data-testid={`btn-delete-file-${file.id}`}>
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ImportProgressBar({ progress, label }: { progress: number; label?: string }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/60">{label || "Import en cours..."}</span>
                <span className="text-xs text-orange-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

export function CameraModal({ open, onClose, onCapture }: {
    open: boolean; onClose: () => void;
    onCapture: (blob: Blob) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(s => {
                    setStream(s);
                    if (videoRef.current) videoRef.current.srcObject = s;
                })
                .catch(() => setError("Impossible d'accéder à la caméra"));
        }
        return () => { stream?.getTracks().forEach(t => t.stop()); };
    }, [open]);

    if (!open) return null;

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0);
        c.toBlob(blob => {
            if (blob) {
                onCapture(blob);
                stream?.getTracks().forEach(t => t.stop());
                onClose();
            }
        }, "image/jpeg", 0.85);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[120] flex flex-col items-center justify-center" onClick={onClose}>
            <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 text-white" data-testid="btn-camera-close">
                    <X className="w-5 h-5" />
                </button>
                {error ? (
                    <div className="text-center py-12">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex justify-center mt-4">
                            <button onClick={capture} className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-105 transition" data-testid="btn-camera-capture" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
