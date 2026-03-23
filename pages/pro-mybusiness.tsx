import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import ChatMaxAI from "@/components/ChatMaxAI";
import { TABS } from "@/components/mybusiness/types";
import { DashboardTab } from "@/components/mybusiness/DashboardTab";
import { AchatsTab } from "@/components/mybusiness/AchatsTab";
import { FraisTab } from "@/components/mybusiness/FraisTab";
import { BanqueTab } from "@/components/mybusiness/BanqueTab";
import { CaisseTab } from "@/components/mybusiness/CaisseTab";
import { GestionRHTab } from "@/components/mybusiness/GestionRHTab";
import {
    isCobaConfigured,
    usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase,
    useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense,
    useBankMovements, useCreateBankMovement, useUpdateBankMovement, useDeleteBankMovement,
    useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan,
    useCashEntries, useCreateCashEntry, useUpdateCashEntry, useDeleteCashEntry,
    useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
    usePayroll, useCreatePayroll, useDeletePayroll, useUpdatePayroll,
    useAbsences, useCreateAbsence, useDeleteAbsence, useUpdateAbsence,
    useAuditOverview,
    useImportBankStatement, useRapprochement, useMatchRapprochement,
    useImportPayrollPdf, useReparsePayroll,
    useScanTicket,
    useFiles, useUploadFile, useDeleteFile, useSendFileEmail, useFileStats,
    useBackups, useCreateBackup,
} from "@/hooks/useCobaBusiness";

interface ProMyBusinessPageProps {
    slug: string;
    onBack?: () => void;
}

export default function ProMyBusinessPage({ slug, onBack }: ProMyBusinessPageProps) {
    const { toast } = useToast();
    const tenantId = slug;
    const { data: currentUser } = useQuery<{ id?: string; firstName?: string; lastName?: string } | null>({ queryKey: ["/api/auth/user"] });
    const { data: currentRestaurant } = useQuery<{ name: string; slug: string } | null>({ queryKey: ["/api/my-restaurant"] });
    const [activeTab, setActiveTab] = useState("dashboard");
    const [compactCards, setCompactCards] = useState(false);
    const [showNewCaisseForm, setShowNewCaisseForm] = useState(false);

    const purchasesQ = usePurchases(tenantId);
    const expensesQ = useExpenses(tenantId);
    const bankQ = useBankMovements(tenantId);
    const loansQ = useLoans(tenantId);
    const cashQ = useCashEntries(tenantId);
    const employeesQ = useEmployees(tenantId);
    const payrollQ = usePayroll(tenantId);
    const absencesQ = useAbsences(tenantId);
    const auditQ = useAuditOverview(tenantId);

    const createPurchaseMut = useCreatePurchase(tenantId);
    const updatePurchaseMut = useUpdatePurchase(tenantId);
    const deletePurchaseMut = useDeletePurchase(tenantId);
    const createExpenseMut = useCreateExpense(tenantId);
    const updateExpenseMut = useUpdateExpense(tenantId);
    const deleteExpenseMut = useDeleteExpense(tenantId);
    const createBankMut = useCreateBankMovement(tenantId);
    const updateBankMut = useUpdateBankMovement(tenantId);
    const deleteBankMut = useDeleteBankMovement(tenantId);
    const createLoanMut = useCreateLoan(tenantId);
    const updateLoanMut = useUpdateLoan(tenantId);
    const deleteLoanMut = useDeleteLoan(tenantId);
    const createCashMut = useCreateCashEntry(tenantId);
    const updateCashMut = useUpdateCashEntry(tenantId);
    const deleteCashMut = useDeleteCashEntry(tenantId);
    const createEmpMut = useCreateEmployee(tenantId);
    const updateEmpMut = useUpdateEmployee(tenantId);
    const deleteEmpMut = useDeleteEmployee(tenantId);
    const createPayMut = useCreatePayroll(tenantId);
    const deletePayMut = useDeletePayroll(tenantId);
    const createAbsMut = useCreateAbsence(tenantId);
    const deleteAbsMut = useDeleteAbsence(tenantId);
    const updateAbsMut = useUpdateAbsence(tenantId);
    const updatePayMut = useUpdatePayroll(tenantId);

    const importBankMut = useImportBankStatement(tenantId);
    const rapprochementQ = useRapprochement(tenantId);
    const matchRapprochementMut = useMatchRapprochement(tenantId);

    const importPayrollMut = useImportPayrollPdf(tenantId);
    const reparseMut = useReparsePayroll(tenantId);

    const scanTicketMut = useScanTicket(tenantId);

    const filesQ = useFiles(tenantId);
    const uploadFileMut = useUploadFile(tenantId);
    const deleteFileMut = useDeleteFile(tenantId);
    const sendEmailMut = useSendFileEmail(tenantId);
    const fileStatsQ = useFileStats(tenantId);
    const backupsQ = useBackups(tenantId);
    const createBackupMut = useCreateBackup(tenantId);

    const files = useMemo(() => Array.isArray(filesQ.data) ? filesQ.data : [], [filesQ.data]);
    const rapprochement = rapprochementQ.data || null;
    const backups = useMemo(() => Array.isArray(backupsQ.data) ? backupsQ.data : [], [backupsQ.data]);
    const fileStats = fileStatsQ.data || null;

    const purchases = useMemo(() => Array.isArray(purchasesQ.data) ? purchasesQ.data : [], [purchasesQ.data]);
    const expenses = useMemo(() => Array.isArray(expensesQ.data) ? expensesQ.data : [], [expensesQ.data]);
    const bankEntries = useMemo(() => Array.isArray(bankQ.data) ? bankQ.data : [], [bankQ.data]);
    const loans = useMemo(() => Array.isArray(loansQ.data) ? loansQ.data : [], [loansQ.data]);
    const cashEntries = useMemo(() => Array.isArray(cashQ.data) ? cashQ.data : [], [cashQ.data]);
    const employees = useMemo(() => Array.isArray(employeesQ.data) ? employeesQ.data : [], [employeesQ.data]);
    const payrolls = useMemo(() => Array.isArray(payrollQ.data) ? payrollQ.data : [], [payrollQ.data]);
    const absences = useMemo(() => Array.isArray(absencesQ.data) ? absencesQ.data : [], [absencesQ.data]);
    const audit = auditQ.data || null;

    if (!isCobaConfigured) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
                    <h2 className="text-xl font-bold text-white mb-2">COBA non configuré</h2>
                    <p className="text-white/60 text-sm">Les variables d'environnement VITE_COBA_API_URL et VITE_COBA_API_KEY ne sont pas configurées.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white">
            <div className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition" data-testid="button-back">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <h1 className="text-lg font-bold text-white">MyBusiness</h1>
                    <div className="flex-1" />
                    <span className="text-xs text-white/30 font-mono">{tenantId}</span>
                </div>
                <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                data-testid={`tab-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${isActive ? "bg-white/10 text-orange-400 border-b-2 border-orange-500" : "text-white/50 hover:text-white/70 hover:bg-white/5"}`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === "dashboard" && (
                    <DashboardTab
                        tenantId={tenantId}
                        onNavigate={setActiveTab}
                        onOpenNewCaisse={() => { setActiveTab("caisse"); setShowNewCaisseForm(true); }}
                        compactCards={compactCards}
                        setCompactCards={setCompactCards}
                        audit={audit}
                        auditLoading={auditQ.isLoading}
                        employees={employees}
                        cashEntries={cashEntries}
                        fileStats={fileStats}
                        backups={backups}
                        createBackupMut={createBackupMut}
                    />
                )}
                {activeTab === "achats" && (
                    <AchatsTab
                        tenantId={tenantId}
                        purchases={purchases}
                        compactCards={compactCards}
                        setCompactCards={setCompactCards}
                        createMut={createPurchaseMut}
                        updateMut={updatePurchaseMut}
                        deleteMut={deletePurchaseMut}
                        files={files}
                        uploadFileMut={uploadFileMut}
                        deleteFileMut={deleteFileMut}
                        sendEmailMut={sendEmailMut}
                    />
                )}
                {activeTab === "frais" && (
                    <FraisTab
                        tenantId={tenantId}
                        expenses={expenses}
                        compactCards={compactCards}
                        setCompactCards={setCompactCards}
                        createMut={createExpenseMut}
                        updateMut={updateExpenseMut}
                        deleteMut={deleteExpenseMut}
                        files={files}
                        uploadFileMut={uploadFileMut}
                        deleteFileMut={deleteFileMut}
                        sendEmailMut={sendEmailMut}
                    />
                )}
                {activeTab === "banque" && (
                    <BanqueTab
                        tenantId={tenantId}
                        bankEntries={bankEntries}
                        loans={loans}
                        compactCards={compactCards}
                        setCompactCards={setCompactCards}
                        createBankMut={createBankMut}
                        updateBankMut={updateBankMut}
                        deleteBankMut={deleteBankMut}
                        createLoanMut={createLoanMut}
                        updateLoanMut={updateLoanMut}
                        deleteLoanMut={deleteLoanMut}
                        importBankMut={importBankMut}
                        rapprochement={rapprochement}
                        matchRapprochementMut={matchRapprochementMut}
                    />
                )}
                {activeTab === "caisse" && (
                    <CaisseTab
                        tenantId={tenantId}
                        cashEntries={cashEntries}
                        compactCards={compactCards}
                        setCompactCards={setCompactCards}
                        createMut={createCashMut}
                        updateMut={updateCashMut}
                        deleteMut={deleteCashMut}
                        showNewCaisseForm={showNewCaisseForm}
                        onCloseNewCaisseForm={() => setShowNewCaisseForm(false)}
                        scanTicketMut={scanTicketMut}
                    />
                )}
                {activeTab === "rh" && (
                    <GestionRHTab
                        tenantId={tenantId}
                        employees={employees}
                        payrolls={payrolls}
                        absences={absences}
                        compactCards={compactCards}
                        setCompactCards={setCompactCards}
                        createEmpMut={createEmpMut}
                        updateEmpMut={updateEmpMut}
                        deleteEmpMut={deleteEmpMut}
                        createPayMut={createPayMut}
                        deletePayMut={deletePayMut}
                        updatePayMut={updatePayMut}
                        createAbsMut={createAbsMut}
                        deleteAbsMut={deleteAbsMut}
                        updateAbsMut={updateAbsMut}
                        importPayrollMut={importPayrollMut}
                        reparseMut={reparseMut}
                        files={files}
                        uploadFileMut={uploadFileMut}
                        deleteFileMut={deleteFileMut}
                        sendEmailMut={sendEmailMut}
                    />
                )}
            </div>

            {currentUser && currentRestaurant && (
                <ChatMaxAI
                    tenantId={tenantId}
                    proUserId={currentUser.id || ""}
                    proUserName={`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Gerant"}
                    restaurantName={currentRestaurant.name}
                />
            )}
        </div>
    );
}
