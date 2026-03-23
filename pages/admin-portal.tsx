import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useOrderSync, useVisibilityRefresh } from "@/hooks/use-order-sync";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  ShoppingBag, 
  LogOut, 
  Search,
  Shield,
  TrendingUp,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  ArrowUpDown,
  Download,
  FileText,
  ChevronUp,
  ChevronDown,
  Upload,
  Image,
  X,
  Settings,
  Plug,
  Unplug,
  FileEdit,
  ExternalLink
} from "lucide-react";
import jsPDF from "jspdf";
import AdminLandingEditor from "@/components/AdminLandingEditor";
import type { Restaurant, Order, User } from "@shared/schema";

function AdminHubRiseConfigForm() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const configQuery = useQuery<{ clientId: string; clientSecret: string; configured: boolean }>({
    queryKey: ["/api/admin/hubrise-config"],
  });

  useEffect(() => {
    if (configQuery.data) {
      setClientId(configQuery.data.clientId);
      setClientSecret(configQuery.data.clientSecret);
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/hubrise-config", { clientId, clientSecret });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hubrise-config"] });
      toast({ title: "Configuration HubRise enregistrée" });
    },
    onError: () => {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    },
  });

  if (configQuery.isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Chargement config HubRise...</div>;
  }

  return (
    <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
      <div className="space-y-2">
        <Label htmlFor="hubrise-client-id" className="text-sm font-medium">HUBRISE_CLIENT_ID</Label>
        <Input
          id="hubrise-client-id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Votre Client ID HubRise"
          data-testid="input-hubrise-client-id"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hubrise-client-secret" className="text-sm font-medium">HUBRISE_CLIENT_SECRET</Label>
        <div className="relative">
          <Input
            id="hubrise-client-secret"
            type={showSecret ? "text" : "password"}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Votre Client Secret HubRise"
            className="pr-10"
            data-testid="input-hubrise-client-secret"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-hubrise-secret"
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || (!clientId.trim() && !clientSecret.trim())}
          data-testid="button-save-hubrise-config"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
          Enregistrer
        </Button>
        {configQuery.data?.configured && (
          <Badge className="bg-green-600">Configuré</Badge>
        )}
        {!configQuery.data?.configured && clientId.trim() === "" && clientSecret.trim() === "" && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">Non configuré</Badge>
        )}
      </div>
    </div>
  );
}

function AdminHubRiseSection({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  
  const hubRiseStatus = useQuery<{
    configured: boolean;
    connected: boolean;
    locationId?: string;
    catalogId?: string;
    customerListId?: string;
    error?: string;
  }>({
    queryKey: ['/api/hubrise/status', restaurantId],
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/hubrise/oauth/authorize?restaurantId=${restaurantId}`);
      const data = await res.json();
      const popup = window.open(data.authUrl, "_blank", "width=600,height=700");
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['/api/hubrise/status', restaurantId] });
          queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/hubrise/disconnect/${restaurantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hubrise/status', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "HubRise déconnecté" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const status = hubRiseStatus.data;

  if (hubRiseStatus.isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Vérification HubRise...</div>;
  }

  if (!status?.configured) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            HubRise non configuré. Renseignez les identifiants ci-dessous.
          </p>
        </div>
        <AdminHubRiseConfigForm />
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600" data-testid="admin-badge-hubrise-connected">Connecté</Badge>
          {status.locationId && <span className="text-xs text-muted-foreground">Location: {status.locationId}</span>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
          data-testid="admin-button-hubrise-disconnect"
        >
          {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unplug className="w-4 h-4 mr-2" />}
          Déconnecter HubRise
        </Button>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Modifier les identifiants</summary>
          <div className="mt-2">
            <AdminHubRiseConfigForm />
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Non connecté</p>
      <Button
        size="sm"
        onClick={() => connectMutation.mutate()}
        disabled={connectMutation.isPending}
        data-testid="admin-button-hubrise-connect"
      >
        {connectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
        Connecter HubRise
      </Button>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Modifier les identifiants</summary>
        <div className="mt-2">
          <AdminHubRiseConfigForm />
        </div>
      </details>
    </div>
  );
}

export default function AdminPortal() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    slug: "",
    contactName: "",
    contactPhone: "",
    address: "",
    phone: "",
    ownerId: "",
    openTime: "09:00",
    closeTime: "22:00",
    deliveryMinOrder: 15,
    isOpen: true,
    subscriptionPlan: "starter",
    subscriptionPrice: 99,
    subscriptionStatus: "trial",
    primaryColor: "#f97316",
    secondaryColor: "#1e293b",
    accentColor: "#f97316",
    heroTitle: "",
    heroSubtitle: "",
    showHeroSection: true,
    showAboutSection: true,
    showMenuSection: true,
    showGallerySection: true,
    showContactSection: true,
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    customDomain: "",
    deliveryZipCodes: [] as string[],
    bankAccountHolder: "",
    bankIban: "",
    bankBic: "",
    bankName: "",
    logoUrl: "",
  });
  
  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // User edit state
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "customer" as string,
    profileImageUrl: "",
    restaurantId: "",
  });
  
  // Owner edit state for restaurant edit dialog
  const [ownerForm, setOwnerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    newPassword: "",
  });
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  
  // Admin login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  
  // Sorting state for restaurants
  const [sortField, setSortField] = useState<"name" | "contactName">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Sorting state for orders
  const [orderSortField, setOrderSortField] = useState<"id" | "customerName" | "total" | "status" | "createdAt">("createdAt");
  const [orderSortOrder, setOrderSortOrder] = useState<"asc" | "desc">("desc");
  
  // Order detail dialog
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });


  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: allOrders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    enabled: !!user,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user,
  });

  const { toast } = useToast();

  useOrderSync({ role: "admin", enabled: !!user && user.role === "admin" });
  useVisibilityRefresh([["/api/admin/orders"], ["/api/admin/users"], ["/api/restaurants"]]);

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Rôle utilisateur mis à jour avec succès" });
    },
    onError: () => {
      toast({ title: "Échec de la mise à jour du rôle", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof userForm }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
      setEditUserDialogOpen(false);
      toast({ title: "Utilisateur mis a jour avec succes" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Echec de la mise a jour", variant: "destructive" });
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: typeof restaurantForm) => {
      return apiRequest("POST", "/api/admin/restaurants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Restaurant créé avec succès" });
      setCreateDialogOpen(false);
      setRestaurantForm({
        name: "",
        slug: "",
        contactName: "",
        contactPhone: "",
        address: "",
        phone: "",
        ownerId: "",
        openTime: "09:00",
        closeTime: "22:00",
        deliveryMinOrder: 15,
        isOpen: true,
        subscriptionPlan: "starter",
        subscriptionPrice: 99,
        subscriptionStatus: "trial",
        primaryColor: "#f97316",
        secondaryColor: "#1e293b",
        accentColor: "#f97316",
        heroTitle: "",
        heroSubtitle: "",
        showHeroSection: true,
        showAboutSection: true,
        showMenuSection: true,
        showGallerySection: true,
        showContactSection: true,
        facebookUrl: "",
        instagramUrl: "",
        twitterUrl: "",
        customDomain: "",
        deliveryZipCodes: [],
        bankAccountHolder: "",
        bankIban: "",
        bankBic: "",
        bankName: "",
        logoUrl: "",
      });
    },
    onError: () => {
      toast({ title: "Échec de la création du restaurant", variant: "destructive" });
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof restaurantForm> }) => {
      return apiRequest("PATCH", `/api/admin/restaurants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Restaurant mis à jour avec succès" });
      setEditDialogOpen(false);
      setSelectedRestaurant(null);
    },
    onError: (error: Error) => {
      let msg = "Échec de la mise à jour du restaurant";
      try {
        const jsonStr = error.message.replace(/^\d+:\s*/, "");
        const parsed = JSON.parse(jsonStr);
        if (parsed.error) msg = parsed.error;
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  // Logo upload handler
  const handleLogoUpload = async (file: File) => {
    if (!selectedRestaurant) return;
    
    setLogoUploading(true);
    try {
      // Get presigned upload URL
      const response = await apiRequest("POST", `/api/admin/restaurants/${selectedRestaurant.id}/logo/upload-url`);
      const { uploadURL, objectPath } = await response.json();
      
      // Upload file directly to storage
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      
      // Update restaurant with new logo path
      await apiRequest("PATCH", `/api/admin/restaurants/${selectedRestaurant.id}`, {
        logoUrl: objectPath,
      });
      
      setRestaurantForm(prev => ({ ...prev, logoUrl: objectPath }));
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Logo téléchargé avec succès" });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({ title: "Échec du téléchargement du logo", variant: "destructive" });
    } finally {
      setLogoUploading(false);
      setLogoFile(null);
    }
  };

  const handleRemoveLogo = async () => {
    if (!selectedRestaurant) return;
    
    try {
      await apiRequest("PATCH", `/api/admin/restaurants/${selectedRestaurant.id}`, {
        logoUrl: null,
      });
      
      setRestaurantForm(prev => ({ ...prev, logoUrl: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Logo supprimé" });
    } catch (error) {
      toast({ title: "Échec de la suppression du logo", variant: "destructive" });
    }
  };

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/restaurants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Restaurant supprimé avec succès" });
    },
    onError: () => {
      toast({ title: "Échec de la suppression du restaurant", variant: "destructive" });
    },
  });

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setRestaurantForm({
      name: restaurant.name,
      slug: restaurant.slug || "",
      contactName: restaurant.contactName || "",
      contactPhone: restaurant.contactPhone || "",
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      ownerId: restaurant.ownerId || "",
      openTime: restaurant.openTime || "09:00",
      closeTime: restaurant.closeTime || "22:00",
      deliveryMinOrder: restaurant.deliveryMinOrder || 15,
      isOpen: restaurant.isOpen ?? true,
      subscriptionPlan: restaurant.subscriptionPlan || "starter",
      subscriptionPrice: restaurant.subscriptionPrice || 99,
      subscriptionStatus: restaurant.subscriptionStatus || "trial",
      primaryColor: restaurant.primaryColor || "#f97316",
      secondaryColor: restaurant.secondaryColor || "#1e293b",
      accentColor: restaurant.accentColor || "#f97316",
      heroTitle: restaurant.heroTitle || "",
      heroSubtitle: restaurant.heroSubtitle || "",
      showHeroSection: restaurant.showHeroSection ?? true,
      showAboutSection: restaurant.showAboutSection ?? true,
      showMenuSection: restaurant.showMenuSection ?? true,
      showGallerySection: restaurant.showGallerySection ?? true,
      showContactSection: restaurant.showContactSection ?? true,
      facebookUrl: restaurant.facebookUrl || "",
      instagramUrl: restaurant.instagramUrl || "",
      twitterUrl: restaurant.twitterUrl || "",
      customDomain: restaurant.customDomain || "",
      deliveryZipCodes: restaurant.deliveryZipCodes || [],
      bankAccountHolder: restaurant.bankAccountHolder || "",
      bankIban: restaurant.bankIban || "",
      bankBic: restaurant.bankBic || "",
      bankName: restaurant.bankName || "",
      logoUrl: restaurant.logoUrl || "",
    });
    setLogoFile(null);
    
    // Load owner information
    const owner = allUsers.find(u => u.id === restaurant.ownerId);
    if (owner) {
      setOwnerForm({
        firstName: owner.firstName || "",
        lastName: owner.lastName || "",
        email: owner.email || "",
        newPassword: "",
      });
    } else {
      setOwnerForm({ firstName: "", lastName: "", email: "", newPassword: "" });
    }
    setShowOwnerPassword(false);
    setEditDialogOpen(true);
  };

  const handleEditUser = (u: User) => {
    setSelectedUser(u);
    setUserForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || "",
      password: "",
      phone: u.phone || "",
      address: u.address || "",
      role: u.role === "restaurant_owner" ? "owner" : (u.role || "customer"),
      profileImageUrl: u.profileImageUrl || "",
      restaurantId: u.restaurantId || "",
    });
    setShowEditPassword(false);
    setEditUserDialogOpen(true);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const adminLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/login", { 
        email: loginEmail, 
        password: loginPassword 
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.requires2FA) {
        setTwoFactorToken(data.twoFactorToken);
        setTwoFactorMessage(data.message);
        setTwoFactorStep(true);
        setLoginError("");
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
        setLoginError("");
      }
    },
    onError: (error: any) => {
      const msg = error.message || "";
      try {
        const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        setLoginError(parsed.error || "Email ou mot de passe incorrect");
      } catch {
        setLoginError(msg || "Email ou mot de passe incorrect");
      }
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/verify-2fa", {
        token: twoFactorToken,
        code: twoFactorCode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setLoginError("");
      setTwoFactorStep(false);
      setTwoFactorCode("");
      setTwoFactorToken("");
    },
    onError: (error: any) => {
      const msg = error.message || "";
      try {
        const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
        setLoginError(parsed.error || "Code invalide");
      } catch {
        setLoginError(msg || "Code invalide");
      }
    },
  });

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    // Client-side validation
    if (!loginEmail || !loginPassword) {
      setLoginError("Email et mot de passe requis");
      return;
    }
    
    // Password validation: 10+ chars, letters, numbers, special chars
    if (loginPassword.length < 10) {
      setLoginError("Le mot de passe doit contenir au moins 10 caractères");
      return;
    }
    
    if (!/[a-zA-Z]/.test(loginPassword)) {
      setLoginError("Le mot de passe doit contenir des lettres");
      return;
    }
    
    if (!/\d/.test(loginPassword)) {
      setLoginError("Le mot de passe doit contenir des chiffres");
      return;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(loginPassword)) {
      setLoginError("Le mot de passe doit contenir des caractères spéciaux");
      return;
    }
    
    adminLoginMutation.mutate();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Show login form if not logged in OR if logged in but not as admin
  if (!user || user.role !== "admin") {
    const isLoggedInAsOtherRole = user && user.role !== "admin";
    
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 z-50 bg-background">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">macommande.shop Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://macommande.shop" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" data-testid="link-view-restaurants">
                  Voir les restaurants
                </Button>
              </a>
              <a href="https://macommande.shop/pro" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" data-testid="link-pro-login">
                  Espace Pro
                </Button>
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{twoFactorStep ? "Vérification 2FA" : "Administration"}</CardTitle>
              <CardDescription>
                {twoFactorStep 
                  ? "Saisissez le code envoyé à votre email sécurisé" 
                  : "Connectez-vous pour gérer la plateforme"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoggedInAsOtherRole && !twoFactorStep && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                  Vous êtes connecté en tant que {user.role === "restaurant_owner" ? "Pro" : "Client"}. 
                  Connectez-vous avec un compte administrateur pour accéder à cette page.
                </div>
              )}

              {!twoFactorStep ? (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      data-testid="input-admin-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Votre mot de passe"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="input-admin-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      10+ caractères avec lettres, chiffres et caractères spéciaux
                    </p>
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive" data-testid="text-login-error">{loginError}</p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={adminLoginMutation.isPending}
                    data-testid="button-admin-login"
                  >
                    {adminLoginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Accès réservé aux administrateurs de la plateforme.</p>
                  </div>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setLoginError(""); verify2FAMutation.mutate(); }} className="space-y-4">
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{twoFactorMessage}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="2fa-code">Code de vérification</Label>
                    <Input
                      id="2fa-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      required
                      data-testid="input-2fa-code"
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Saisissez le code à 6 chiffres envoyé par email
                    </p>
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive" data-testid="text-2fa-error">{loginError}</p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={verify2FAMutation.isPending || twoFactorCode.length !== 6}
                    data-testid="button-verify-2fa"
                  >
                    {verify2FAMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Vérifier le code
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      setTwoFactorStep(false);
                      setTwoFactorToken("");
                      setTwoFactorCode("");
                      setLoginError("");
                    }}
                    data-testid="button-back-to-login"
                  >
                    Retour à la connexion
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingOrders = allOrders.filter(o => o.status === "pending").length;

  const filteredRestaurants = restaurants
    .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const valA = (sortField === "contactName" ? a.contactName : a.name) || "";
      const valB = (sortField === "contactName" ? b.contactName : b.name) || "";
      const comparison = valA.localeCompare(valB);
      return sortOrder === "asc" ? comparison : -comparison;
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-bold text-lg">Administration ApptoOrder</h1>
              <p className="text-xs text-muted-foreground">Gestion de la plateforme</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {user.firstName || "Admin"} {user.lastName || ""}
            </span>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = "/123admin/monitoring"}
              className="gap-2"
              data-testid="button-coba-monitoring"
            >
              <TrendingUp className="w-4 h-4" />
              COBA Monitoring
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-admin-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total restaurants</p>
                  <p className="text-2xl font-bold" data-testid="text-total-restaurants">{restaurants.length}</p>
                </div>
                <Store className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                  <p className="text-2xl font-bold" data-testid="text-total-users">{allUsers.length}</p>
                </div>
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total commandes</p>
                  <p className="text-2xl font-bold" data-testid="text-total-orders">{allOrders.length}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenus plateforme</p>
                  <p className="text-2xl font-bold" data-testid="text-total-revenue">{totalRevenue.toFixed(2)}€</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="restaurants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">
              <Store className="w-4 h-4 mr-2" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Toutes les commandes
            </TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">
              <CreditCard className="w-4 h-4 mr-2" />
              Facturation
            </TabsTrigger>
            <TabsTrigger value="landing" data-testid="tab-landing">
              <FileEdit className="w-4 h-4 mr-2" />
              Landing Page
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-restaurants"
                />
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-restaurant">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un restaurant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un restaurant</DialogTitle>
                    <DialogDescription>Ajouter un nouveau restaurant à la plateforme</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du restaurant *</Label>
                      <Input
                        id="name"
                        value={restaurantForm.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const autoSlug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").replace(/^-+|-+$/g, "");
                          setRestaurantForm({ ...restaurantForm, name, slug: restaurantForm.slug === "" || restaurantForm.slug === restaurantForm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").replace(/^-+|-+$/g, "") ? autoSlug : restaurantForm.slug });
                        }}
                        placeholder="Nom du restaurant"
                        data-testid="input-new-restaurant-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL personnalisée *</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">macommande.shop/</span>
                        <Input
                          id="slug"
                          value={restaurantForm.slug}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                          placeholder="mon-restaurant"
                          data-testid="input-new-restaurant-slug"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Uniquement lettres minuscules, chiffres et tirets</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Nom du contact *</Label>
                        <Input
                          id="contactName"
                          value={restaurantForm.contactName}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, contactName: e.target.value })}
                          placeholder="Prénom Nom"
                          data-testid="input-new-contact-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Téléphone du contact *</Label>
                        <Input
                          id="contactPhone"
                          value={restaurantForm.contactPhone}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, contactPhone: e.target.value })}
                          placeholder="06 12 34 56 78"
                          data-testid="input-new-contact-phone"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner">Pro (Propriétaire)</Label>
                      <Select
                        value={restaurantForm.ownerId}
                        onValueChange={(value) => setRestaurantForm({ ...restaurantForm, ownerId: value })}
                      >
                        <SelectTrigger data-testid="select-restaurant-owner">
                          <SelectValue placeholder="Sélectionner un propriétaire" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName} {u.lastName} ({u.role === "owner" ? "Pro" : u.role === "customer" ? "Client" : u.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                        placeholder="Adresse"
                        data-testid="input-new-restaurant-address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                        placeholder="Téléphone"
                        data-testid="input-new-restaurant-phone"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="openTime">Heure d'ouverture</Label>
                        <Input
                          id="openTime"
                          type="time"
                          value={restaurantForm.openTime}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, openTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closeTime">Heure de fermeture</Label>
                        <Input
                          id="closeTime"
                          type="time"
                          value={restaurantForm.closeTime}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, closeTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createRestaurantMutation.mutate(restaurantForm)}
                      disabled={!restaurantForm.name || !restaurantForm.slug || createRestaurantMutation.isPending}
                      data-testid="button-confirm-create-restaurant"
                    >
                      {createRestaurantMutation.isPending ? "Création..." : "Créer le restaurant"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {restaurantsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (sortField === "name") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortField("name");
                              setSortOrder("asc");
                            }
                          }}
                          className="flex items-center gap-1 -ml-2"
                          data-testid="button-sort-name"
                        >
                          Nom
                          <ArrowUpDown className="w-4 h-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (sortField === "contactName") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortField("contactName");
                              setSortOrder("asc");
                            }
                          }}
                          className="flex items-center gap-1 -ml-2"
                          data-testid="button-sort-contact"
                        >
                          Contact
                          <ArrowUpDown className="w-4 h-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>HubRise</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRestaurants.map(restaurant => (
                      <TableRow key={restaurant.id} data-testid={`row-restaurant-${restaurant.id}`}>
                        <TableCell className="font-medium">{restaurant.name}</TableCell>
                        <TableCell className="text-sm" data-testid={`text-contact-name-${restaurant.id}`}>
                          {restaurant.contactName || "-"}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-contact-phone-${restaurant.id}`}>
                          {restaurant.contactPhone || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">/{restaurant.slug}</TableCell>
                        <TableCell>{restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={restaurant.isOpen ? "default" : "secondary"}>
                            {restaurant.isOpen ? "Ouvert" : "Fermé"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={restaurant.hubriseConnected ? "default" : "outline"}
                            className={restaurant.hubriseConnected ? "bg-green-600" : ""}
                            data-testid={`badge-hubrise-${restaurant.id}`}
                          >
                            {restaurant.hubriseConnected ? "Connecté" : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditRestaurant(restaurant)}
                              data-testid={`button-manage-restaurant-${restaurant.id}`}
                              title="Gérer le compte"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-delete-restaurant-${restaurant.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer le restaurant</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer "{restaurant.name}" ? Cela supprimera également toutes les catégories, plats et commandes associés à ce restaurant. Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteRestaurantMutation.mutate(restaurant.id)}
                                    data-testid={`button-confirm-delete-${restaurant.id}`}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRestaurants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucun restaurant trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Edit Restaurant Dialog - Full Edit */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Gestion du compte — {selectedRestaurant?.name}</DialogTitle>
                  <DialogDescription>Gestion complète du compte restaurant</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6">
                    {selectedRestaurant && (
                      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 text-xs">
                        <div>
                          <span className="text-muted-foreground">ID:</span>{" "}
                          <span className="font-mono" data-testid="text-restaurant-id" title={selectedRestaurant.id}>{selectedRestaurant.id.slice(0, 8)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Owner:</span>{" "}
                          <span className="font-mono" data-testid="text-owner-id" title={selectedRestaurant.ownerId || ""}>{selectedRestaurant.ownerId ? selectedRestaurant.ownerId.slice(0, 8) : "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Créé le:</span>{" "}
                          <span data-testid="text-created-date">{selectedRestaurant.createdAt ? new Date(selectedRestaurant.createdAt).toLocaleDateString() : "-"}</span>
                        </div>
                      </div>
                    )}
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium border-b pb-2">Informations de base</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Nom du restaurant *</Label>
                          <Input
                            id="edit-name"
                            value={restaurantForm.name}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                            placeholder="Nom du restaurant"
                            data-testid="input-edit-restaurant-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-slug">URL personnalisée</Label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">macommande.shop/</span>
                            <Input
                              id="edit-slug"
                              value={restaurantForm.slug}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                              placeholder="mon-restaurant"
                              data-testid="input-edit-restaurant-slug"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-phone">Téléphone restaurant</Label>
                          <Input
                            id="edit-phone"
                            value={restaurantForm.phone}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                            placeholder="Téléphone"
                            data-testid="input-edit-restaurant-phone"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-contactName">Nom du contact</Label>
                          <Input
                            id="edit-contactName"
                            value={restaurantForm.contactName}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, contactName: e.target.value })}
                            placeholder="Prénom Nom"
                            data-testid="input-edit-contact-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-contactPhone">Téléphone du contact</Label>
                          <Input
                            id="edit-contactPhone"
                            value={restaurantForm.contactPhone}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, contactPhone: e.target.value })}
                            placeholder="06 12 34 56 78"
                            data-testid="input-edit-contact-phone"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-address">Adresse</Label>
                        <Input
                          id="edit-address"
                          value={restaurantForm.address}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                          placeholder="Adresse"
                          data-testid="input-edit-restaurant-address"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-openTime">Heure d'ouverture</Label>
                          <Input
                            id="edit-openTime"
                            type="time"
                            value={restaurantForm.openTime}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, openTime: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-closeTime">Heure de fermeture</Label>
                          <Input
                            id="edit-closeTime"
                            type="time"
                            value={restaurantForm.closeTime}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, closeTime: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            checked={restaurantForm.isOpen}
                            onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, isOpen: checked })}
                          />
                          <Label>Restaurant ouvert</Label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-deliveryMinOrder">Commande min livraison (€)</Label>
                          <Input
                            id="edit-deliveryMinOrder"
                            type="number"
                            value={restaurantForm.deliveryMinOrder}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryMinOrder: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-deliveryZipCodes">Codes postaux de livraison</Label>
                          <Input
                            id="edit-deliveryZipCodes"
                            value={restaurantForm.deliveryZipCodes?.join(", ") || ""}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryZipCodes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                            placeholder="13001, 13006, 13008"
                            data-testid="input-edit-delivery-zip-codes"
                          />
                          <p className="text-xs text-muted-foreground">Séparez les codes postaux par des virgules</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-customDomain">Domaine personnalisé</Label>
                          <Input
                            id="edit-customDomain"
                            value={restaurantForm.customDomain}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, customDomain: e.target.value })}
                            placeholder="example.com"
                          />
                        </div>
                      </div>
                    </div>

                    {selectedRestaurant && (
                      <div className="space-y-4">
                        <h4 className="font-medium border-b pb-2">Intégration HubRise (Caisse)</h4>
                        <AdminHubRiseSection restaurantId={selectedRestaurant.id} />
                      </div>
                    )}

                    {/* Logo Upload - Master Admin Only */}
                    {user?.isMasterAdmin === "true" && (
                      <div className="space-y-4">
                        <h4 className="font-medium border-b pb-2">Logo du restaurant</h4>
                        <div className="flex items-center gap-4">
                          {restaurantForm.logoUrl ? (
                            <div className="relative">
                              <img
                                src={`/objects/${restaurantForm.logoUrl.replace(/^\/objects\//, '')}`}
                                alt="Logo du restaurant"
                                className="w-24 h-24 object-contain rounded-md border bg-muted"
                                data-testid="img-restaurant-logo"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-2 -right-2"
                                onClick={handleRemoveLogo}
                                data-testid="button-remove-logo"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-24 h-24 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/50">
                              <Image className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="logo-upload">Télécharger un logo</Label>
                            <div className="flex gap-2">
                              <Input
                                id="logo-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      toast({ title: "Le fichier est trop volumineux (max 2MB)", variant: "destructive" });
                                      return;
                                    }
                                    setLogoFile(file);
                                  }
                                }}
                                className="flex-1"
                                data-testid="input-logo-upload"
                              />
                              <Button
                                onClick={() => logoFile && handleLogoUpload(logoFile)}
                                disabled={!logoFile || logoUploading}
                                data-testid="button-upload-logo"
                              >
                                {logoUploading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Formats acceptés: JPEG, PNG, WebP. Taille max: 2MB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subscription */}
                    <div className="space-y-4">
                      <h4 className="font-medium border-b pb-2">Abonnement</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Plan</Label>
                          <Select
                            value={restaurantForm.subscriptionPlan}
                            onValueChange={(value) => setRestaurantForm({ ...restaurantForm, subscriptionPlan: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-subscriptionPrice">Prix (€/mois)</Label>
                          <Input
                            id="edit-subscriptionPrice"
                            type="number"
                            value={restaurantForm.subscriptionPrice}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, subscriptionPrice: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Statut</Label>
                          <Select
                            value={restaurantForm.subscriptionStatus}
                            onValueChange={(value) => setRestaurantForm({ ...restaurantForm, subscriptionStatus: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Branding */}
                    <div className="space-y-4">
                      <h4 className="font-medium border-b pb-2">Couleurs de marque</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-primaryColor">Couleur primaire</Label>
                          <div className="flex gap-2">
                            <Input
                              id="edit-primaryColor"
                              type="color"
                              value={restaurantForm.primaryColor}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, primaryColor: e.target.value })}
                              className="w-12 h-9 p-1"
                            />
                            <Input
                              value={restaurantForm.primaryColor}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, primaryColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-secondaryColor">Couleur secondaire</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={restaurantForm.secondaryColor}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, secondaryColor: e.target.value })}
                              className="w-12 h-9 p-1"
                            />
                            <Input
                              value={restaurantForm.secondaryColor}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, secondaryColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-accentColor">Couleur d'accent</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={restaurantForm.accentColor}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, accentColor: e.target.value })}
                              className="w-12 h-9 p-1"
                            />
                            <Input
                              value={restaurantForm.accentColor}
                              onChange={(e) => setRestaurantForm({ ...restaurantForm, accentColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Landing Page */}
                    <div className="space-y-4">
                      <h4 className="font-medium border-b pb-2">Page d'accueil</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-heroTitle">Titre Hero</Label>
                          <Input
                            id="edit-heroTitle"
                            value={restaurantForm.heroTitle}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, heroTitle: e.target.value })}
                            placeholder="Bienvenue dans notre restaurant"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-heroSubtitle">Sous-titre Hero</Label>
                          <Input
                            id="edit-heroSubtitle"
                            value={restaurantForm.heroSubtitle}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, heroSubtitle: e.target.value })}
                            placeholder="La meilleure cuisine de la ville"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={restaurantForm.showHeroSection}
                            onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, showHeroSection: checked })}
                          />
                          <Label>Hero</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={restaurantForm.showAboutSection}
                            onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, showAboutSection: checked })}
                          />
                          <Label>About</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={restaurantForm.showMenuSection}
                            onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, showMenuSection: checked })}
                          />
                          <Label>Menu</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={restaurantForm.showGallerySection}
                            onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, showGallerySection: checked })}
                          />
                          <Label>Gallery</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={restaurantForm.showContactSection}
                            onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, showContactSection: checked })}
                          />
                          <Label>Contact</Label>
                        </div>
                      </div>
                    </div>

                    {/* Social Media */}
                    <div className="space-y-4">
                      <h4 className="font-medium border-b pb-2">Réseaux sociaux</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-facebookUrl">Facebook URL</Label>
                          <Input
                            id="edit-facebookUrl"
                            value={restaurantForm.facebookUrl}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, facebookUrl: e.target.value })}
                            placeholder="https://facebook.com/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-instagramUrl">Instagram URL</Label>
                          <Input
                            id="edit-instagramUrl"
                            value={restaurantForm.instagramUrl}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, instagramUrl: e.target.value })}
                            placeholder="https://instagram.com/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-twitterUrl">Twitter URL</Label>
                          <Input
                            id="edit-twitterUrl"
                            value={restaurantForm.twitterUrl}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, twitterUrl: e.target.value })}
                            placeholder="https://twitter.com/..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banking Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium border-b pb-2">Informations Bancaires</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-bankAccountHolder">Titulaire du compte</Label>
                          <Input
                            id="edit-bankAccountHolder"
                            value={restaurantForm.bankAccountHolder}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, bankAccountHolder: e.target.value })}
                            placeholder="Nom du titulaire"
                            data-testid="input-bank-account-holder"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-bankName">Nom de la banque</Label>
                          <Input
                            id="edit-bankName"
                            value={restaurantForm.bankName}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, bankName: e.target.value })}
                            placeholder="Ex: BNP Paribas"
                            data-testid="input-bank-name"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-bankIban">IBAN</Label>
                          <Input
                            id="edit-bankIban"
                            value={restaurantForm.bankIban}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, bankIban: e.target.value })}
                            placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                            data-testid="input-bank-iban"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-bankBic">BIC/SWIFT</Label>
                          <Input
                            id="edit-bankBic"
                            value={restaurantForm.bankBic}
                            onChange={(e) => setRestaurantForm({ ...restaurantForm, bankBic: e.target.value })}
                            placeholder="BNPAFRPP"
                            data-testid="input-bank-bic"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Owner Account - Only visible to master admin */}
                    {selectedRestaurant?.ownerId && user?.isMasterAdmin === "true" && (
                      <div className="space-y-4">
                        <h4 className="font-medium border-b pb-2">Compte Proprietaire</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-owner-firstName">Prenom</Label>
                            <Input
                              id="edit-owner-firstName"
                              value={ownerForm.firstName}
                              onChange={(e) => setOwnerForm({ ...ownerForm, firstName: e.target.value })}
                              placeholder="Prenom"
                              data-testid="input-owner-firstName"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-owner-lastName">Nom</Label>
                            <Input
                              id="edit-owner-lastName"
                              value={ownerForm.lastName}
                              onChange={(e) => setOwnerForm({ ...ownerForm, lastName: e.target.value })}
                              placeholder="Nom"
                              data-testid="input-owner-lastName"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-email">Email de connexion</Label>
                          <Input
                            id="edit-owner-email"
                            type="email"
                            value={ownerForm.email}
                            onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                            placeholder="email@example.com"
                            data-testid="input-owner-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-password">Nouveau mot de passe (laisser vide pour ne pas changer)</Label>
                          <div className="relative">
                            <Input
                              id="edit-owner-password"
                              type={showOwnerPassword ? "text" : "password"}
                              value={ownerForm.newPassword}
                              onChange={(e) => setOwnerForm({ ...ownerForm, newPassword: e.target.value })}
                              placeholder="Nouveau mot de passe"
                              data-testid="input-owner-password"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                              data-testid="button-toggle-owner-password"
                            >
                              {showOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedRestaurant) return;
                      
                      // Update owner if there's an owner and form has changes (master admin only)
                      if (selectedRestaurant.ownerId && user?.isMasterAdmin === "true") {
                        const originalOwner = allUsers.find(u => u.id === selectedRestaurant.ownerId);
                        const hasOwnerChanges = originalOwner && (
                          ownerForm.firstName !== (originalOwner.firstName || "") ||
                          ownerForm.lastName !== (originalOwner.lastName || "") ||
                          ownerForm.email !== (originalOwner.email || "") ||
                          ownerForm.newPassword.length > 0
                        );
                        
                        if (hasOwnerChanges) {
                          try {
                            await apiRequest("PATCH", `/api/admin/users/${selectedRestaurant.ownerId}`, {
                              firstName: ownerForm.firstName,
                              lastName: ownerForm.lastName,
                              email: ownerForm.email,
                              password: ownerForm.newPassword || undefined,
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                          } catch (error) {
                            toast({ title: "Échec de la mise à jour du compte propriétaire", variant: "destructive" });
                            return;
                          }
                        }
                      }
                      
                      // Update restaurant
                      updateRestaurantMutation.mutate({ 
                        id: selectedRestaurant.id, 
                        data: restaurantForm 
                      });
                    }}
                    disabled={!restaurantForm.name || updateRestaurantMutation.isPending}
                    data-testid="button-confirm-edit-restaurant"
                  >
                    {updateRestaurantMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <>
                {/* Admins Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-destructive" />
                    <h3 className="font-semibold text-lg">Administrateurs ({allUsers.filter((u: any) => u.role === "admin").length})</h3>
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Changer le role</TableHead>
                          <TableHead>Inscrit le</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.filter((u: any) => u.role === "admin").map((u: any) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">
                              {u.firstName} {u.lastName}
                            </TableCell>
                            <TableCell>{u.email || "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={u.role === "restaurant_owner" ? "owner" : (u.role || "customer")}
                                onValueChange={(role) => updateUserRoleMutation.mutate({ userId: u.id, role: role === "owner" ? "restaurant_owner" : role })}
                              >
                                <SelectTrigger className="w-28" data-testid={`select-user-role-${u.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="customer">Client</SelectItem>
                                  <SelectItem value="owner">Pro</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditUser(u)}
                                data-testid={`button-edit-user-${u.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {allUsers.filter((u: any) => u.role === "admin").length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              Aucun administrateur
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>

                {/* Restaurants partenaires Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Restaurants partenaires ({restaurants.length})</h3>
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Changer le role</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {restaurants.map((restaurant: any) => {
                          const owner = allUsers.find((u: any) => u.id === restaurant.ownerId);
                          return (
                            <TableRow key={restaurant.id} data-testid={`row-restaurant-${restaurant.id}`}>
                              <TableCell className="font-medium">
                                {restaurant.name}
                              </TableCell>
                              <TableCell>
                                {owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || '-' : '-'}
                              </TableCell>
                              <TableCell>{owner?.email || "-"}</TableCell>
                              <TableCell>
                                {owner && (
                                  <Select
                                    value={owner.role === "restaurant_owner" ? "owner" : (owner.role || "customer")}
                                    onValueChange={(role) => updateUserRoleMutation.mutate({ userId: owner.id, role: role === "owner" ? "restaurant_owner" : role })}
                                  >
                                    <SelectTrigger className="w-28" data-testid={`select-user-role-${owner.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="customer">Client</SelectItem>
                                      <SelectItem value="owner">Pro</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                {owner && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEditUser(owner)}
                                    data-testid={`button-edit-user-${owner.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {restaurants.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              Aucun restaurant partenaire
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>

                {/* Clients Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Clients ({allUsers.filter((u: any) => u.role === "customer" || !u.role).length})</h3>
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Changer le role</TableHead>
                          <TableHead>Inscrit le</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.filter((u: any) => u.role === "customer" || !u.role).map((u: any) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">
                              {u.firstName} {u.lastName}
                            </TableCell>
                            <TableCell>{u.email || "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={u.role === "restaurant_owner" ? "owner" : (u.role || "customer")}
                                onValueChange={(role) => updateUserRoleMutation.mutate({ userId: u.id, role: role === "owner" ? "restaurant_owner" : role })}
                              >
                                <SelectTrigger className="w-28" data-testid={`select-user-role-${u.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="customer">Client</SelectItem>
                                  <SelectItem value="owner">Pro</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditUser(u)}
                                data-testid={`button-edit-user-${u.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {allUsers.filter((u: any) => u.role === "customer" || !u.role).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              Aucun client
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </>
            )}

            {/* Edit User Dialog */}
            <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier l'utilisateur</DialogTitle>
                  <DialogDescription>
                    Modifier toutes les informations du compte utilisateur
                    {selectedUser?.isMasterAdmin === "true" && (
                      <Badge variant="destructive" className="ml-2">Administrateur Principal</Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* User ID - Read only */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">ID Utilisateur</Label>
                    <div className="font-mono text-sm bg-muted p-2 rounded-md" data-testid="text-user-id">
                      {selectedUser?.id || "-"}
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-role">Role</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                      disabled={selectedUser?.isMasterAdmin === "true"}
                    >
                      <SelectTrigger data-testid="select-edit-user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Client</SelectItem>
                        <SelectItem value="owner">Pro (Restaurateur)</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedUser?.isMasterAdmin === "true" && (
                      <p className="text-xs text-muted-foreground">L'administrateur principal ne peut pas etre retrograde</p>
                    )}
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-firstName">Prenom</Label>
                      <Input
                        id="edit-user-firstName"
                        value={userForm.firstName}
                        onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                        placeholder="Prenom"
                        data-testid="input-edit-user-firstName"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-lastName">Nom</Label>
                      <Input
                        id="edit-user-lastName"
                        value={userForm.lastName}
                        onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                        placeholder="Nom"
                        data-testid="input-edit-user-lastName"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-email">Email</Label>
                    <Input
                      id="edit-user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="email@example.com"
                      data-testid="input-edit-user-email"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="edit-user-password"
                        type={showEditPassword ? "text" : "password"}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="Laisser vide pour ne pas modifier"
                        data-testid="input-edit-user-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        data-testid="button-toggle-edit-password"
                      >
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Laisser vide pour conserver le mot de passe actuel</p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-phone">Telephone</Label>
                    <Input
                      id="edit-user-phone"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                      data-testid="input-edit-user-phone"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-address">Adresse</Label>
                    <Input
                      id="edit-user-address"
                      value={userForm.address}
                      onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                      placeholder="Adresse complete"
                      data-testid="input-edit-user-address"
                    />
                  </div>

                  {/* Profile Image URL */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-profileImageUrl">URL de la photo de profil</Label>
                    <Input
                      id="edit-user-profileImageUrl"
                      value={userForm.profileImageUrl}
                      onChange={(e) => setUserForm({ ...userForm, profileImageUrl: e.target.value })}
                      placeholder="https://example.com/photo.jpg"
                      data-testid="input-edit-user-profileImageUrl"
                    />
                  </div>

                  {/* Restaurant ID - Only for customers */}
                  {userForm.role === "customer" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-restaurantId">Restaurant associe</Label>
                      <Select
                        value={userForm.restaurantId || "none"}
                        onValueChange={(value) => setUserForm({ ...userForm, restaurantId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger data-testid="select-edit-user-restaurant">
                          <SelectValue placeholder="Aucun restaurant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun restaurant</SelectItem>
                          {restaurants.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Restaurant auquel ce client est associe</p>
                    </div>
                  )}

                  {/* Banking Info - Only for Pro users */}
                  {(userForm.role === "owner" || selectedUser?.role === "restaurant_owner") && (() => {
                    const userRestaurant = restaurants.find(r => r.ownerId === selectedUser?.id);
                    return userRestaurant ? (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <Label className="font-semibold">Informations bancaires</Label>
                          <Badge variant="outline" className="text-xs">{userRestaurant.name}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Titulaire du compte</Label>
                            <div className="text-sm bg-muted p-2 rounded-md" data-testid="text-bank-holder">
                              {userRestaurant.bankAccountHolder || "-"}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Nom de la banque</Label>
                            <div className="text-sm bg-muted p-2 rounded-md" data-testid="text-bank-name">
                              {userRestaurant.bankName || "-"}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">IBAN</Label>
                          <div className="text-sm font-mono bg-muted p-2 rounded-md" data-testid="text-bank-iban">
                            {userRestaurant.bankIban || "-"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">BIC/SWIFT</Label>
                          <div className="text-sm font-mono bg-muted p-2 rounded-md" data-testid="text-bank-bic">
                            {userRestaurant.bankBic || "-"}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Pour modifier les informations bancaires, editez le restaurant dans l'onglet Restaurants
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <Label className="font-semibold">Informations bancaires</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Aucun restaurant associe a cet utilisateur Pro
                        </p>
                      </div>
                    );
                  })()}

                  {/* Metadata - Read only */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Date de creation</Label>
                      <div className="text-sm" data-testid="text-user-createdAt">
                        {selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleString('fr-FR') : "-"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Derniere mise a jour</Label>
                      <div className="text-sm" data-testid="text-user-updatedAt">
                        {selectedUser?.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString('fr-FR') : "-"}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={() => selectedUser && updateUserMutation.mutate({ 
                      userId: selectedUser.id, 
                      data: {
                        ...userForm,
                        role: userForm.role === "owner" ? "restaurant_owner" : userForm.role
                      }
                    })}
                    disabled={updateUserMutation.isPending}
                    data-testid="button-confirm-edit-user"
                  >
                    {updateUserMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          if (orderSortField === "id") setOrderSortOrder(orderSortOrder === "asc" ? "desc" : "asc");
                          else { setOrderSortField("id"); setOrderSortOrder("asc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Order ID
                          {orderSortField === "id" && (orderSortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          if (orderSortField === "customerName") setOrderSortOrder(orderSortOrder === "asc" ? "desc" : "asc");
                          else { setOrderSortField("customerName"); setOrderSortOrder("asc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Client
                          {orderSortField === "customerName" && (orderSortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </TableHead>
                      <TableHead>Restaurant</TableHead>
                      <TableHead
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          if (orderSortField === "total") setOrderSortOrder(orderSortOrder === "asc" ? "desc" : "asc");
                          else { setOrderSortField("total"); setOrderSortOrder("desc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Total
                          {orderSortField === "total" && (orderSortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          if (orderSortField === "status") setOrderSortOrder(orderSortOrder === "asc" ? "desc" : "asc");
                          else { setOrderSortField("status"); setOrderSortOrder("asc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {orderSortField === "status" && (orderSortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          if (orderSortField === "createdAt") setOrderSortOrder(orderSortOrder === "asc" ? "desc" : "asc");
                          else { setOrderSortField("createdAt"); setOrderSortOrder("desc"); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {orderSortField === "createdAt" && (orderSortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...allOrders].sort((a, b) => {
                      let comparison = 0;
                      switch (orderSortField) {
                        case "id":
                          comparison = a.id.localeCompare(b.id);
                          break;
                        case "customerName":
                          comparison = (a.customerName || "").localeCompare(b.customerName || "");
                          break;
                        case "total":
                          comparison = a.total - b.total;
                          break;
                        case "status":
                          comparison = (a.status || "").localeCompare(b.status || "");
                          break;
                        case "createdAt":
                          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                          break;
                      }
                      return orderSortOrder === "asc" ? comparison : -comparison;
                    }).map(order => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {restaurants.find(r => r.id === order.restaurantId)?.name || order.restaurantId.slice(0, 8) + "..."}
                        </TableCell>
                        <TableCell>{order.total.toFixed(2)}€</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === "completed" || order.status === "delivered" ? "default" :
                            order.status === "pending" ? "secondary" :
                            order.status === "cancelled" ? "destructive" : "outline"
                          }>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedOrder(order);
                                setOrderDetailOpen(true);
                              }}
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucune commande trouvee
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Order Detail Dialog */}
            <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Details de la commande</DialogTitle>
                  <DialogDescription>
                    Commande #{selectedOrder?.id.slice(0, 8)}...
                  </DialogDescription>
                </DialogHeader>
                {selectedOrder && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Client</Label>
                        <p className="font-medium">{selectedOrder.customerName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Telephone</Label>
                        <p>{selectedOrder.customerPhone || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Adresse</Label>
                      <p>{selectedOrder.customerAddress || "-"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Type</Label>
                        <Badge variant="outline">{selectedOrder.orderType === "delivery" ? "Livraison" : "A emporter"}</Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Statut</Label>
                        <Badge variant={
                          selectedOrder.status === "completed" || selectedOrder.status === "delivered" ? "default" :
                          selectedOrder.status === "pending" ? "secondary" :
                          selectedOrder.status === "cancelled" ? "destructive" : "outline"
                        }>
                          {selectedOrder.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Restaurant</Label>
                      <p>{restaurants.find(r => r.id === selectedOrder.restaurantId)?.name || selectedOrder.restaurantId}</p>
                    </div>
                    <div className="border-t pt-2">
                      <Label className="text-muted-foreground text-xs">Articles</Label>
                      <div className="space-y-1 mt-1">
                        {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                          selectedOrder.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{(item.price * item.quantity).toFixed(2)}€</span>
                            </div>
                          ))
                        ) : <p className="text-sm text-muted-foreground">Aucun article</p>}
                      </div>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{selectedOrder.total.toFixed(2)}€</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <Label className="text-xs">Cree le</Label>
                        <p>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('fr-FR') : "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs">ID Commande</Label>
                        <p className="font-mono text-xs">{selectedOrder.id}</p>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOrderDetailOpen(false)}>
                    Fermer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Revenu mensuel</p>
                      <p className="text-2xl font-bold text-green-500" data-testid="text-monthly-revenue">
                        {restaurants.reduce((sum, r) => sum + (r.subscriptionPrice || 99), 0).toFixed(2)}€
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Abonnements actifs</p>
                      <p className="text-2xl font-bold" data-testid="text-active-subscriptions">
                        {restaurants.filter(r => r.subscriptionStatus === "active").length}
                      </p>
                    </div>
                    <Store className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Comptes en essai</p>
                      <p className="text-2xl font-bold text-orange-500" data-testid="text-trial-accounts">
                        {restaurants.filter(r => r.subscriptionStatus === "trial" || !r.subscriptionStatus).length}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Comptabilite Partenaires</CardTitle>
                <CardDescription>Gerer les abonnements et la facturation des restaurants</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Partenaire depuis</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prochaine facture</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants.map(restaurant => (
                    <TableRow key={restaurant.id} data-testid={`row-billing-${restaurant.id}`}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">/{restaurant.slug}</TableCell>
                      <TableCell className="text-sm">
                        {restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString('fr-FR') : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {restaurant.subscriptionPlan || "starter"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{(restaurant.subscriptionPrice || 99).toFixed(2)}€/mo</TableCell>
                      <TableCell>
                        <Badge variant={
                          restaurant.subscriptionStatus === "active" ? "default" :
                          restaurant.subscriptionStatus === "trial" ? "secondary" :
                          restaurant.subscriptionStatus === "paused" ? "outline" : "destructive"
                        }>
                          {restaurant.subscriptionStatus || "trial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {restaurant.nextBillingDate 
                          ? new Date(restaurant.nextBillingDate).toLocaleDateString()
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={async () => {
                            try {
                              const plan = restaurant.subscriptionPlan === "pro" ? "pro" : "starter";
                              const res = await fetch("/api/admin/billing/checkout", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ restaurantId: restaurant.id, plan }),
                              });
                              const data = await res.json();
                              if (data.url) {
                                window.open(data.url, "_blank");
                              } else {
                                toast({ title: data.error || "Stripe non configuré", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Erreur Stripe", variant: "destructive" });
                            }
                          }}
                          data-testid={`button-stripe-checkout-${restaurant.id}`}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Paiement
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const now = new Date();
                            const invoiceId = `INV-${restaurant.slug?.toUpperCase().slice(0,6) || 'REST'}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
                            const period = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                            const amount = restaurant.subscriptionPrice || 99;
                            
                            const doc = new jsPDF();
                            
                            doc.setFontSize(20);
                            doc.text("FACTURE", 105, 20, { align: "center" });
                            
                            doc.setFontSize(12);
                            doc.text(`Facture N°: ${invoiceId}`, 20, 40);
                            doc.text(`Date: ${now.toLocaleDateString('fr-FR')}`, 20, 50);
                            
                            doc.setFontSize(14);
                            doc.text("Émetteur:", 20, 70);
                            doc.setFontSize(11);
                            doc.text("macommande.shop SaaS", 20, 80);
                            doc.text("Service de plateforme de commande en ligne", 20, 87);
                            
                            doc.setFontSize(14);
                            doc.text("Client:", 20, 105);
                            doc.setFontSize(11);
                            doc.text(restaurant.name || "Restaurant", 20, 115);
                            doc.text(restaurant.address || "", 20, 122);
                            doc.text(restaurant.phone || "", 20, 129);
                            
                            doc.setFontSize(12);
                            doc.text("Description", 20, 150);
                            doc.text("Montant", 160, 150);
                            doc.line(20, 155, 190, 155);
                            
                            doc.setFontSize(11);
                            doc.text(`Abonnement ${(restaurant.subscriptionPlan || 'starter').charAt(0).toUpperCase() + (restaurant.subscriptionPlan || 'starter').slice(1)}`, 20, 165);
                            doc.text(`Période: ${period}`, 20, 172);
                            doc.text(`${amount.toFixed(2)} EUR`, 160, 165);
                            
                            doc.line(20, 185, 190, 185);
                            doc.setFontSize(12);
                            doc.text("Total HT:", 130, 195);
                            doc.text(`${(amount / 1.20).toFixed(2)} EUR`, 160, 195);
                            doc.text("TVA (20%):", 130, 203);
                            doc.text(`${(amount - amount / 1.20).toFixed(2)} EUR`, 160, 203);
                            doc.setFontSize(14);
                            doc.text("Total TTC:", 130, 215);
                            doc.text(`${amount.toFixed(2)} EUR`, 160, 215);
                            
                            doc.setFontSize(10);
                            doc.text("Merci pour votre confiance!", 105, 250, { align: "center" });
                            
                            doc.save(`facture-${invoiceId}.pdf`);
                            toast({ title: "Facture PDF telechargee" });
                          }}
                          data-testid={`button-download-invoice-${restaurant.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {restaurants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucun restaurant trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="landing" className="space-y-4">
            <AdminLandingEditor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
