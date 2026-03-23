import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useOrderSync, useVisibilityRefresh } from "@/hooks/use-order-sync";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { 
  Store, 
  UtensilsCrossed, 
  ShoppingBag, 
  LogOut, 
  Settings,
  Plus,
  Pencil,
  Trash2,
  ChefHat,
  Clock,
  MapPin,
  Phone,
  Link2,
  Palette,
  Globe,
  ImagePlus,
  X,
  TrendingUp,
  TrendingDown,
  Euro,
  CheckCircle,
  AlertCircle,
  Package,
  Filter,
  Bell,
  RefreshCw,
  Eye,
  Lock,
  Layout,
  CreditCard,
  Download,
  FileText,
  Users,
  Mail,
  User,
  Key,
  Plug,
  Unplug,
  Loader2,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  EyeOff,
  AlertTriangle,
  Shield,
  Gift,
  Star
} from "lucide-react";
import jsPDF from "jspdf";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ObjectUploader } from "@/components/ObjectUploader";
import { SortableList, DragHandle } from "@/components/SortableList";
import type { Restaurant, Category, Dish, Order, RestaurantPhoto, RestaurantService } from "@shared/schema";
import ChatMaxAI from "@/components/ChatMaxAI";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface AuthUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImageUrl?: string;
  role?: string;
  claims?: {
    sub: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

interface ProPortalProps {
  slug?: string;
}

function HubRiseCard({ restaurantId }: { restaurantId?: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [catalogId, setCatalogId] = useState("");

  const integrationsQuery = useQuery<{
    hubrise: { accessToken: string; locationId: string; catalogId: string; connected: boolean };
    stripe: { accountId: string; publishableKey: string; secretKey: string; connected: boolean };
  }>({
    queryKey: ["/api/my-restaurant/integrations"],
    enabled: !!restaurantId,
  });

  const hubrise = integrationsQuery.data?.hubrise;

  useEffect(() => {
    if (hubrise) {
      setAccessToken(hubrise.accessToken);
      setLocationId(hubrise.locationId);
      setCatalogId(hubrise.catalogId);
    }
  }, [hubrise]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/my-restaurant/integrations/hubrise", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, locationId, catalogId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Echec");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/integrations"] });
      setEditing(false);
      toast({ title: "HubRise mis a jour" });
    },
    onError: () => {
      toast({ title: "Erreur", variant: "destructive" });
    },
  });

  const isConnected = hubrise?.connected || false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>HubRise (Caisse POS)</CardTitle>
              <CardDescription>Synchronisez vos commandes avec votre logiciel de caisse via HubRise.</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""} data-testid="badge-hubrise-status">
            {isConnected ? "Connecte" : "Non configure"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement...
          </div>
        ) : !editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Access Token</p>
                <p className="font-mono text-xs truncate" data-testid="text-hubrise-token">{hubrise?.accessToken || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location ID</p>
                <p className="font-mono text-xs" data-testid="text-hubrise-location">{hubrise?.locationId || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Catalog ID</p>
                <p className="font-mono text-xs" data-testid="text-hubrise-catalog">{hubrise?.catalogId || "—"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="button-hubrise-edit">
              <Pencil className="w-4 h-4 mr-2" />
              {isConnected ? "Modifier" : "Configurer"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="hubrise-token">Access Token</Label>
              <Input id="hubrise-token" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Votre HubRise access token" data-testid="input-hubrise-token" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hubrise-location">Location ID</Label>
              <Input id="hubrise-location" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="Ex: 1a2b3c" data-testid="input-hubrise-location" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hubrise-catalog">Catalog ID (optionnel)</Label>
              <Input id="hubrise-catalog" value={catalogId} onChange={(e) => setCatalogId(e.target.value)} placeholder="Ex: abc123" data-testid="input-hubrise-catalog" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-hubrise-save">
                {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); if (hubrise) { setAccessToken(hubrise.accessToken); setLocationId(hubrise.locationId); setCatalogId(hubrise.catalogId); } }} data-testid="button-hubrise-cancel">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoyaltyConfig({ restaurantId }: { restaurantId?: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [pointsPerEuro, setPointsPerEuro] = useState(10);
  const [pointsToRedeem, setPointsToRedeem] = useState(100);
  const [rewardValue, setRewardValue] = useState(5);

  const restaurantQuery = useQuery<Restaurant>({
    queryKey: ["/api/my-restaurant"],
  });

  useEffect(() => {
    if (restaurantQuery.data) {
      setEnabled(restaurantQuery.data.loyaltyEnabled ?? false);
      setPointsPerEuro(restaurantQuery.data.loyaltyPointsPerEuro ?? 10);
      setPointsToRedeem(restaurantQuery.data.loyaltyPointsToRedeem ?? 100);
      setRewardValue(restaurantQuery.data.loyaltyRewardValue ?? 5);
    }
  }, [restaurantQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/my-restaurant/loyalty", {
        loyaltyEnabled: enabled,
        loyaltyPointsPerEuro: pointsPerEuro,
        loyaltyPointsToRedeem: pointsToRedeem,
        loyaltyRewardValue: rewardValue,
      });
    },
    onSuccess: () => {
      toast({ title: "Programme de fidélité mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Programme de fidélité
        </CardTitle>
        <CardDescription>
          Récompensez vos clients fidèles avec des points à chaque commande
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium" data-testid="text-loyalty-status">
              {enabled ? "Activé" : "Désactivé"}
            </p>
            <p className="text-sm text-muted-foreground">
              Les clients gagnent des points à chaque commande
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid="switch-loyalty-enabled"
          />
        </div>

        {enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pointsPerEuro">Points par € dépensé</Label>
              <Input
                id="pointsPerEuro"
                type="number"
                min={1}
                value={pointsPerEuro}
                onChange={(e) => setPointsPerEuro(Number(e.target.value))}
                data-testid="input-points-per-euro"
              />
              <p className="text-xs text-muted-foreground">
                Ex: 10 pts/€ → commande de 25€ = 250 points
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pointsToRedeem">Points pour 1 récompense</Label>
              <Input
                id="pointsToRedeem"
                type="number"
                min={1}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                data-testid="input-points-to-redeem"
              />
              <p className="text-xs text-muted-foreground">
                Nombre de points nécessaires pour débloquer une réduction
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rewardValue">Valeur récompense (€)</Label>
              <Input
                id="rewardValue"
                type="number"
                min={0}
                step={0.5}
                value={rewardValue}
                onChange={(e) => setRewardValue(Number(e.target.value))}
                data-testid="input-reward-value"
              />
              <p className="text-xs text-muted-foreground">
                Réduction offerte quand le client utilise ses points
              </p>
            </div>
          </div>
        )}

        {enabled && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">
                <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
                Résumé du programme
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-loyalty-summary">
                Vos clients gagnent <strong>{pointsPerEuro} points</strong> par euro dépensé.
                Avec <strong>{pointsToRedeem} points</strong>, ils obtiennent une réduction de{" "}
                <strong>{rewardValue.toFixed(2)}€</strong>.
                {pointsPerEuro > 0 && (
                  <> Soit après <strong>{(pointsToRedeem / pointsPerEuro).toFixed(0)}€</strong> d'achats.</>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-loyalty"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function StripeCard({ restaurantId }: { restaurantId?: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const integrationsQuery = useQuery<{
    hubrise: { accessToken: string; locationId: string; catalogId: string; connected: boolean };
    stripe: { accountId: string; publishableKey: string; secretKey: string; connected: boolean };
  }>({
    queryKey: ["/api/my-restaurant/integrations"],
    enabled: !!restaurantId,
  });

  const stripe = integrationsQuery.data?.stripe;

  useEffect(() => {
    if (stripe) {
      setAccountId(stripe.accountId);
      setPublishableKey(stripe.publishableKey);
      setSecretKey(stripe.secretKey);
    }
  }, [stripe]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/my-restaurant/integrations/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, publishableKey, secretKey }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Echec");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/integrations"] });
      setEditing(false);
      toast({ title: "Stripe mis a jour" });
    },
    onError: () => {
      toast({ title: "Erreur", variant: "destructive" });
    },
  });

  const isConnected = stripe?.connected || false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-500" />
            <div>
              <CardTitle>Stripe (Paiement en ligne)</CardTitle>
              <CardDescription>Acceptez les paiements par carte bancaire directement sur votre portail de commande.</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-purple-600" : ""} data-testid="badge-stripe-status">
            {isConnected ? "Actif" : "Non configure"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrationsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement...
          </div>
        ) : !editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Account ID</p>
                <p className="font-mono text-xs truncate" data-testid="text-stripe-account">{stripe?.accountId || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Publishable Key</p>
                <p className="font-mono text-xs truncate" data-testid="text-stripe-pk">{stripe?.publishableKey || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Secret Key</p>
                <p className="font-mono text-xs" data-testid="text-stripe-sk">{stripe?.secretKey ? "••••••••" : "—"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="button-stripe-edit">
              <Pencil className="w-4 h-4 mr-2" />
              {isConnected ? "Modifier" : "Configurer"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="stripe-account">Account ID (optionnel)</Label>
              <Input id="stripe-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="acct_..." data-testid="input-stripe-account" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-pk">Publishable Key</Label>
              <Input id="stripe-pk" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} placeholder="pk_live_..." data-testid="input-stripe-pk" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-sk">Secret Key</Label>
              <Input id="stripe-sk" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="sk_live_..." data-testid="input-stripe-sk" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-stripe-save">
                {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); if (stripe) { setAccountId(stripe.accountId); setPublishableKey(stripe.publishableKey); setSecretKey(stripe.secretKey); } }} data-testid="button-stripe-cancel">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProPortal({ slug }: ProPortalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDishDialog, setShowDishDialog] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [dishImageUrl, setDishImageUrl] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<RestaurantPhoto | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [newZipCode, setNewZipCode] = useState("");
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<RestaurantService | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceStartTime, setServiceStartTime] = useState("");
  const [serviceEndTime, setServiceEndTime] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
  } | null>(null);
  const [editingCustomerCredentials, setEditingCustomerCredentials] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [showDeleteCustomerConfirm, setShowDeleteCustomerConfirm] = useState(false);
  
  // Settings form state - Basic Info
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsOpenTime, setSettingsOpenTime] = useState("");
  const [settingsCloseTime, setSettingsCloseTime] = useState("");
  const [settingsMinOrder, setSettingsMinOrder] = useState("");
  const [basicInfoDirty, setBasicInfoDirty] = useState(false);
  
  // Settings form state - Branding
  const [settingsPrimaryColor, setSettingsPrimaryColor] = useState("");
  const [settingsSecondaryColor, setSettingsSecondaryColor] = useState("");
  const [settingsAccentColor, setSettingsAccentColor] = useState("");
  const [brandingDirty, setBrandingDirty] = useState(false);
  
  // Settings form state - Custom Domain
  const [settingsCustomDomain, setSettingsCustomDomain] = useState("");
  const [domainDirty, setDomainDirty] = useState(false);
  
  // Settings form state - Landing Page
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroCTAText, setHeroCTAText] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [aboutImageUrl, setAboutImageUrl] = useState("");
  const [showHeroSection, setShowHeroSection] = useState(true);
  const [showAboutSection, setShowAboutSection] = useState(true);
  const [showMenuSection, setShowMenuSection] = useState(true);
  const [showGallerySection, setShowGallerySection] = useState(true);
  const [showContactSection, setShowContactSection] = useState(true);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [landingPageDirty, setLandingPageDirty] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  const loginForm = useForm<{ email: string; password: string }>({
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch("/api/pro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, rememberMe }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Échec de la connexion");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Connexion réussie" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const { data: user, isLoading: userLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
  });

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/my-restaurant"],
    enabled: !!user && user.role === "restaurant_owner",
  });

  // Validate slug matches the user's restaurant
  const isSlugValid = !slug || !!(restaurant && restaurant.slug === slug);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/pro");
    }
  }, [user, userLoading, setLocation]);

  // Only fetch data when slug is validated
  const categoriesQuery = useQuery({ queryKey: ["/api/my-restaurant/categories"], enabled: !!restaurant && isSlugValid });
  const categories = (categoriesQuery.data as Category[] | undefined) ?? [];

  const dishesQuery = useQuery({ queryKey: ["/api/my-restaurant/dishes"], enabled: !!restaurant && isSlugValid });
  const dishes = (dishesQuery.data as Dish[] | undefined) ?? [];

  const ordersQuery = useQuery({ queryKey: ["/api/my-restaurant/orders"], enabled: !!restaurant && isSlugValid });
  const orders = (ordersQuery.data as Order[] | undefined) ?? [];

  const statsQuery = useQuery({ queryKey: ["/api/my-restaurant/stats"], enabled: !!restaurant && isSlugValid });
  const stats = statsQuery.data as { totalOrders: number; totalRevenue: number; pendingOrders: number; todayOrders: number } | undefined;

  const photosQuery = useQuery({ queryKey: ["/api/my-restaurant/photos"], enabled: !!restaurant && isSlugValid });
  const galleryPhotos = (photosQuery.data as RestaurantPhoto[] | undefined) ?? [];

  interface CustomerData {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
  }

  const customersQuery = useQuery({ queryKey: ["/api/my-restaurant/customers"], enabled: !!restaurant && isSlugValid });
  const customers = (customersQuery.data as CustomerData[] | undefined) ?? [];
  const customersLoading = customersQuery.isLoading;

  useOrderSync({ restaurantId: restaurant?.id, userId: user?.id, role: "owner", enabled: !!(restaurant && isSlugValid) });
  useVisibilityRefresh([["/api/my-restaurant/orders"], ["/api/my-restaurant/stats"]]);

  const pushNotifications = usePushNotifications(restaurant?.id);

  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: Partial<Restaurant>) => {
      return apiRequest("PATCH", "/api/my-restaurant", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
      toast({ title: "Restaurant mis à jour avec succès" });
    },
    onError: () => {
      toast({ title: "Échec de la mise à jour du restaurant", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; nameEn: string }) => {
      return apiRequest("POST", "/api/my-restaurant/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/categories"] });
      setShowCategoryDialog(false);
      toast({ title: "Catégorie créée avec succès" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      return apiRequest("PATCH", `/api/my-restaurant/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/categories"] });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      toast({ title: "Catégorie mise à jour avec succès" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/my-restaurant/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/categories"] });
      toast({ title: "Catégorie supprimée avec succès" });
    },
  });

  const createDishMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; price: number; categoryId: string; imageUrl?: string }) => {
      return apiRequest("POST", "/api/my-restaurant/dishes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/dishes"] });
      setShowDishDialog(false);
      setDishImageUrl(null);
      toast({ title: "Plat créé avec succès" });
    },
  });

  const updateDishMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Dish> }) => {
      return apiRequest("PATCH", `/api/my-restaurant/dishes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/dishes"] });
      setShowDishDialog(false);
      setEditingDish(null);
      setDishImageUrl(null);
      toast({ title: "Plat mis à jour avec succès" });
    },
  });

  const duplicateDishMutation = useMutation({
    mutationFn: async (dish: Dish) => {
      return apiRequest("POST", "/api/my-restaurant/dishes", {
        name: `${dish.name} (copie)`,
        description: dish.description || "",
        price: dish.price,
        categoryId: dish.categoryId,
        imageUrl: dish.imageUrl || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/dishes"] });
      toast({ title: "Plat dupliqué avec succès" });
    },
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/my-restaurant/dishes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/dishes"] });
      toast({ title: "Plat supprimé avec succès" });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return apiRequest("PUT", "/api/my-restaurant/categories/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/categories"] });
    },
  });

  const reorderDishesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return apiRequest("PUT", "/api/my-restaurant/dishes/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/dishes"] });
    },
  });

  const createPhotoMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; caption?: string; sortOrder?: number }) => {
      return apiRequest("POST", "/api/my-restaurant/photos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/photos"] });
      setShowPhotoDialog(false);
      setNewPhotoUrl(null);
      toast({ title: "Photo ajoutée" });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RestaurantPhoto> }) => {
      return apiRequest("PATCH", `/api/my-restaurant/photos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/photos"] });
      setShowPhotoDialog(false);
      setEditingPhoto(null);
      toast({ title: "Photo mise à jour" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/my-restaurant/photos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/photos"] });
      toast({ title: "Photo supprimée" });
    },
  });

  const servicesQuery = useQuery({ queryKey: ["/api/my-restaurant/services"], enabled: !!restaurant && isSlugValid });
  const services = (servicesQuery.data as RestaurantService[] | undefined) ?? [];

  const createServiceMutation = useMutation({
    mutationFn: async (data: { name: string; startTime: string; endTime: string }) => {
      return apiRequest("POST", "/api/my-restaurant/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/services"] });
      setShowServiceDialog(false);
      resetServiceForm();
      toast({ title: "Service ajouté" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RestaurantService> }) => {
      return apiRequest("PATCH", `/api/my-restaurant/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/services"] });
      setShowServiceDialog(false);
      setEditingService(null);
      resetServiceForm();
      toast({ title: "Service mis à jour" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/my-restaurant/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/services"] });
      toast({ title: "Service supprimé" });
    },
  });

  const resetServiceForm = () => {
    setServiceName("");
    setServiceStartTime("");
    setServiceEndTime("");
  };

  const handleSaveService = () => {
    if (!serviceName.trim() || !serviceStartTime || !serviceEndTime) {
      toast({ title: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    // Validate that start time is before end time
    const [startHours, startMins] = serviceStartTime.split(':').map(Number);
    const [endHours, endMins] = serviceEndTime.split(':').map(Number);
    const startMinutes = startHours * 60 + startMins;
    const endMinutes = endHours * 60 + endMins;
    
    if (startMinutes >= endMinutes) {
      toast({ title: "L'heure de début doit être avant l'heure de fin", variant: "destructive" });
      return;
    }

    if (editingService) {
      updateServiceMutation.mutate({ 
        id: editingService.id, 
        data: { name: serviceName, startTime: serviceStartTime, endTime: serviceEndTime } 
      });
    } else {
      createServiceMutation.mutate({ 
        name: serviceName, 
        startTime: serviceStartTime, 
        endTime: serviceEndTime 
      });
    }
  };

  const openEditServiceDialog = (service: RestaurantService) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceStartTime(service.startTime);
    setServiceEndTime(service.endTime);
    setShowServiceDialog(true);
  };

  const openNewServiceDialog = () => {
    setEditingService(null);
    resetServiceForm();
    setShowServiceDialog(true);
  };

  // Initialize settings form state when restaurant data loads
  useEffect(() => {
    if (restaurant) {
      setSettingsName(restaurant.name || "");
      setSettingsPhone(restaurant.phone || "");
      setSettingsAddress(restaurant.address || "");
      setSettingsOpenTime(restaurant.openTime || "09:00");
      setSettingsCloseTime(restaurant.closeTime || "22:00");
      setSettingsMinOrder(String(restaurant.deliveryMinOrder || 10));
      setSettingsPrimaryColor(restaurant.primaryColor || "#f97316");
      setSettingsSecondaryColor(restaurant.secondaryColor || "#1e293b");
      setSettingsAccentColor(restaurant.accentColor || "#f97316");
      setSettingsCustomDomain(restaurant.customDomain || "");
      // Landing page settings
      setHeroTitle(restaurant.heroTitle || "");
      setHeroSubtitle(restaurant.heroSubtitle || "");
      setHeroImageUrl(restaurant.heroImageUrl || "");
      setHeroCTAText(restaurant.heroCTAText || "Commander maintenant");
      setAboutText(restaurant.aboutText || "");
      setAboutImageUrl(restaurant.aboutImageUrl || "");
      setShowHeroSection(restaurant.showHeroSection ?? true);
      setShowAboutSection(restaurant.showAboutSection ?? true);
      setShowMenuSection(restaurant.showMenuSection ?? true);
      setShowGallerySection(restaurant.showGallerySection ?? true);
      setShowContactSection(restaurant.showContactSection ?? true);
      setFacebookUrl(restaurant.facebookUrl || "");
      setInstagramUrl(restaurant.instagramUrl || "");
      setTwitterUrl(restaurant.twitterUrl || "");
      // Reset dirty flags when data loads
      setBasicInfoDirty(false);
      setBrandingDirty(false);
      setDomainDirty(false);
      setLandingPageDirty(false);
    }
  }, [restaurant]);

  const handleSaveBasicInfo = () => {
    updateRestaurantMutation.mutate({
      name: settingsName,
      phone: settingsPhone,
      address: settingsAddress,
      openTime: settingsOpenTime,
      closeTime: settingsCloseTime,
      deliveryMinOrder: parseFloat(settingsMinOrder) || 10,
    }, {
      onSuccess: () => {
        setBasicInfoDirty(false);
        toast({ title: "Paramètres enregistrés" });
      }
    });
  };

  const handleSaveBranding = () => {
    updateRestaurantMutation.mutate({
      primaryColor: settingsPrimaryColor,
      secondaryColor: settingsSecondaryColor,
      accentColor: settingsAccentColor,
    }, {
      onSuccess: () => {
        setBrandingDirty(false);
        toast({ title: "Couleurs enregistrées" });
      }
    });
  };

  const handleSaveCustomDomain = () => {
    updateRestaurantMutation.mutate({
      customDomain: settingsCustomDomain || null,
    }, {
      onSuccess: () => {
        setDomainDirty(false);
        toast({ title: "Domaine enregistré" });
      }
    });
  };

  const handleSaveLandingPage = () => {
    updateRestaurantMutation.mutate({
      heroTitle: heroTitle || null,
      heroSubtitle: heroSubtitle || null,
      heroImageUrl: heroImageUrl || null,
      heroCTAText: heroCTAText || null,
      aboutText: aboutText || null,
      aboutImageUrl: aboutImageUrl || null,
      showHeroSection,
      showAboutSection,
      showMenuSection,
      showGallerySection,
      showContactSection,
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      twitterUrl: twitterUrl || null,
    }, {
      onSuccess: () => {
        setLandingPageDirty(false);
        toast({ title: "Page d'accueil enregistrée" });
      }
    });
  };

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/my-restaurant/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/my-profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Échec du changement de mot de passe");
      }
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      toast({ title: "Mot de passe modifié avec succès" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateCustomerCredentialsMutation = useMutation({
    mutationFn: async ({ id, email, password }: { id: string; email?: string; password?: string }) => {
      return apiRequest("PATCH", `/api/my-restaurant/customers/${id}`, { email, password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] });
      setEditingCustomerCredentials(false);
      setCustomerEmail("");
      setCustomerPassword("");
      toast({ title: "Identifiants du client mis à jour" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/my-restaurant/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] });
      setShowCustomerDialog(false);
      setSelectedCustomer(null);
      setShowDeleteCustomerConfirm(false);
      toast({ title: "Compte client supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    setPasswordError("");
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Tous les champs sont requis");
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    
    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      setPasswordError("Le nouveau mot de passe doit contenir des lettres et des chiffres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }
    
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleAddZipCode = () => {
    if (!restaurant || !newZipCode.trim()) return;
    
    const zipCode = newZipCode.trim();
    const currentZipCodes = restaurant.deliveryZipCodes || [];
    
    if (currentZipCodes.includes(zipCode)) {
      toast({ title: "Ce code postal existe déjà", variant: "destructive" });
      return;
    }
    
    updateRestaurantMutation.mutate({ 
      deliveryZipCodes: [...currentZipCodes, zipCode] 
    }, {
      onSuccess: () => {
        setNewZipCode("");
        toast({ title: "Code postal ajouté" });
      }
    });
  };

  const handleRemoveZipCode = (zipCode: string) => {
    if (!restaurant) return;
    
    const currentZipCodes = restaurant.deliveryZipCodes || [];
    const updatedZipCodes = currentZipCodes.filter(z => z !== zipCode);
    
    updateRestaurantMutation.mutate({ 
      deliveryZipCodes: updatedZipCodes 
    }, {
      onSuccess: () => {
        toast({ title: "Code postal supprimé" });
      }
    });
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "GET", credentials: "include" });
    window.location.href = "/pro";
  };

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
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

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Espace Professionnel</CardTitle>
            <CardDescription>
              Connectez-vous pour gérer votre restaurant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  {...loginForm.register("email", { required: true })}
                  data-testid="input-pro-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register("password", { required: true })}
                  data-testid="input-pro-password"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me-pro"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  data-testid="checkbox-remember-me-pro"
                />
                <Label htmlFor="remember-me-pro" className="text-sm font-normal cursor-pointer">
                  Se souvenir de moi
                </Label>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-pro-login"
              >
                {loginMutation.isPending ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only restaurant owners can access Pro portal
  if (user.role !== "restaurant_owner") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Accès refusé</CardTitle>
            <CardDescription>
              Cette page est réservée aux propriétaires de restaurant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline"
              onClick={handleLogout} 
              className="w-full"
              data-testid="button-pro-access-denied-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>Aucun restaurant trouvé</CardTitle>
            <CardDescription>
              Vous n'avez pas encore de restaurant. Contactez un administrateur pour commencer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline"
              onClick={handleLogout} 
              className="w-full"
              data-testid="button-pro-logout-no-restaurant"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verify slug matches the user's restaurant (if slug is provided in URL)
  if (slug && restaurant.slug !== slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Acces refuse</CardTitle>
            <CardDescription>
              Vous n'avez pas la permission d'acceder a ce restaurant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setLocation(`/pro/${restaurant.slug}`)} 
              className="w-full"
              data-testid="button-go-to-my-restaurant"
            >
              Aller a mon restaurant
            </Button>
            <Button 
              variant="outline"
              onClick={handleLogout} 
              className="w-full"
              data-testid="button-logout-wrong-restaurant"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se deconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = stats?.pendingOrders || orders.filter(o => o.status === "pending").length;
  const preparingOrders = orders.filter(o => o.status === "preparing").length;
  const readyOrders = orders.filter(o => o.status === "ready").length;
  const todayOrders = stats?.todayOrders || orders.filter(o => o.createdAt && new Date(o.createdAt).toDateString() === new Date().toDateString()).length;
  const totalRevenue = stats?.totalRevenue || orders.reduce((sum, o) => sum + o.total, 0);
  const todayRevenue = orders.filter(o => o.createdAt && new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((sum, o) => sum + o.total, 0);
  const totalOrders = stats?.totalOrders || orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const filteredOrders = orders.filter(o => {
    if (orderFilter === "all") return true;
    return o.status === orderFilter;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayOrders = orders.filter(o => o.createdAt && new Date(o.createdAt).toDateString() === date.toDateString());
    return {
      day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
      orders: dayOrders.length,
    };
  });

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    preparing: "En préparation",
    ready: "Prête",
    delivered: "Livrée",
    cancelled: "Annulée",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-orange-500",
    preparing: "bg-blue-500",
    ready: "bg-green-500",
    delivered: "bg-gray-500",
    cancelled: "bg-red-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg">{restaurant.name}</h1>
              <p className="text-xs text-muted-foreground">Tableau de bord</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {pendingOrders > 0 && (
                <Badge variant="destructive" className="animate-pulse" data-testid="badge-pending-orders">
                  <Bell className="w-3 h-3 mr-1" />
                  {pendingOrders} en attente
                </Badge>
              )}
              {preparingOrders > 0 && (
                <Badge className="bg-blue-500" data-testid="badge-preparing-orders">
                  {preparingOrders} en cours
                </Badge>
              )}
              {readyOrders > 0 && (
                <Badge className="bg-green-500" data-testid="badge-ready-orders">
                  {readyOrders} prêtes
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted">
              <span className={`w-2 h-2 rounded-full ${restaurant.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs font-medium">{restaurant.isOpen ? 'Ouvert' : 'Fermé'}</span>
              <Switch
                checked={restaurant.isOpen ?? true}
                onCheckedChange={(checked) => updateRestaurantMutation.mutate({ isOpen: checked })}
                className="ml-1 scale-75"
                data-testid="switch-restaurant-status"
              />
            </div>
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = `/pro/${slug}/mybusiness`}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
              data-testid="button-mybusiness"
            >
              <TrendingUp className="w-4 h-4" />
              MyBusiness
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-pro-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="overflow-visible">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Commandes du jour</p>
                  <p className="text-3xl font-bold mt-1" data-testid="text-today-orders">
                    {todayOrders}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+12%</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-visible">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenu du jour</p>
                  <p className="text-3xl font-bold mt-1" data-testid="text-today-revenue">
                    {todayRevenue.toFixed(0)}€
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+8%</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Euro className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-visible">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">En attente</p>
                  <p className="text-3xl font-bold mt-1 text-orange-500" data-testid="text-pending-orders">
                    {pendingOrders}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">À traiter</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-visible">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Panier moyen</p>
                  <p className="text-3xl font-bold mt-1" data-testid="text-avg-order">
                    {avgOrderValue.toFixed(0)}€
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{totalOrders} commandes</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Revenus - 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}€`, 'Revenu']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Commandes - 7 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [value, 'Commandes']}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Commandes
              {pendingOrders > 0 && (
                <Badge variant="destructive" className="ml-2 scale-75">{pendingOrders}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="menu" data-testid="tab-menu">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="loyalty" data-testid="tab-loyalty">
              <Gift className="w-4 h-4 mr-2" />
              Fidélité
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">
              <CreditCard className="w-4 h-4 mr-2" />
              Facturation
            </TabsTrigger>
            <TabsTrigger value="account" data-testid="tab-account">
              <User className="w-4 h-4 mr-2" />
              Mon Compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-40" data-testid="select-order-filter">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les commandes</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="preparing">En préparation</SelectItem>
                    <SelectItem value="ready">Prêtes</SelectItem>
                    <SelectItem value="delivered">Livrées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">{filteredOrders.length} commande(s)</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] })}
                data-testid="button-refresh-orders"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredOrders.slice(0, 20).map(order => {
                const items = JSON.parse(order.items || "[]");
                const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                return (
                  <Card key={order.id} className={`overflow-visible ${order.status === 'pending' ? 'border-orange-500/50' : ''}`} data-testid={`card-order-${order.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${statusColors[order.status] || 'bg-gray-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{order.customerName}</p>
                              <Badge variant="outline" className="text-xs">
                                {order.orderType === 'delivery' ? 'Livraison' : 'À emporter'}
                              </Badge>
                              <Badge className={`text-xs ${statusColors[order.status]}`}>
                                {order.status === 'delivered' 
                                  ? (order.orderType === 'takeaway' ? 'Récupérée' : 'Livrée')
                                  : (statusLabels[order.status] || order.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {order.customerPhone}
                              </span>
                              {createdAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {createdAt.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            {order.orderType === 'delivery' && order.customerAddress && (
                              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {order.customerAddress}
                              </p>
                            )}
                            <div className="mt-2 space-y-1">
                              {items.map((item: any, idx: number) => (
                                <p key={idx} className="text-sm">
                                  <span className="font-medium">{item.quantity}x</span> {item.name}
                                  <span className="text-muted-foreground ml-2">{(item.price * item.quantity).toFixed(2)}€</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xl font-bold">{order.total.toFixed(2)}€</p>
                          <Select
                            value={order.status}
                            onValueChange={(status) => updateOrderStatusMutation.mutate({ id: order.id, status })}
                          >
                            <SelectTrigger className="w-36" data-testid={`select-order-status-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">En attente</SelectItem>
                              <SelectItem value="preparing">En préparation</SelectItem>
                              <SelectItem value="ready">Prête</SelectItem>
                              <SelectItem value="delivered">Livrée</SelectItem>
                              <SelectItem value="cancelled">Annulée</SelectItem>
                            </SelectContent>
                          </Select>
                          {order.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm"
                                onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: 'preparing' })}
                                data-testid={`button-accept-order-${order.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Accepter
                              </Button>
                            </div>
                          )}
                          {order.status === 'preparing' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: 'ready' })}
                              data-testid={`button-ready-order-${order.id}`}
                            >
                              <Package className="w-4 h-4 mr-1" />
                              Prête
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredOrders.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune commande {orderFilter !== 'all' ? `avec le statut "${statusLabels[orderFilter]}"` : ''}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Gestion du Menu</h2>
                <p className="text-sm text-muted-foreground">{dishes.length} plats dans {categories.length} catégories</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  onClick={() => { setEditingCategory(null); setShowCategoryDialog(true); }}
                  data-testid="button-add-category"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter catégorie
                </Button>
                <Button 
                  onClick={() => { setEditingDish(null); setDishImageUrl(null); setShowDishDialog(true); }}
                  data-testid="button-add-dish"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter plat
                </Button>
              </div>
            </div>

            <SortableList
              items={categories}
              keyExtractor={(cat) => cat.id}
              onReorder={(reordered) => {
                reorderCategoriesMutation.mutate(reordered.map(c => c.id));
              }}
              renderItem={(category, _catIdx, catDragProps) => {
                const isCollapsed = collapsedCategories.has(category.id);
                const categoryDishes = dishes.filter(d => d.categoryId === category.id);
                const toggleCollapse = () => {
                  setCollapsedCategories(prev => {
                    const next = new Set(prev);
                    if (next.has(category.id)) next.delete(category.id);
                    else next.add(category.id);
                    return next;
                  });
                };
                return (
                <Card>
                  <CardHeader 
                    className="flex flex-row items-center justify-between gap-4 pb-2 cursor-pointer select-none"
                    onClick={toggleCollapse}
                    data-testid={`toggle-category-${category.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <DragHandle {...catDragProps} />
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <CardDescription>{category.nameEn}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2">{categoryDishes.length}</Badge>
                    </div>
                    <div className="flex gap-1 items-center">
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setEditingCategory(category); setShowCategoryDialog(true); }}
                        data-testid={`button-edit-category-${category.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); deleteCategoryMutation.mutate(category.id); }}
                        data-testid={`button-delete-category-${category.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {!isCollapsed && (
                  <CardContent>
                    <SortableList
                      items={categoryDishes}
                      keyExtractor={(dish) => dish.id}
                      onReorder={(reordered) => {
                        reorderDishesMutation.mutate(reordered.map(d => d.id));
                      }}
                      renderItem={(dish, _dishIdx, dishDragProps) => (
                        <div 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-md gap-2"
                          data-testid={`dish-item-${dish.id}`}
                        >
                          <DragHandle {...dishDragProps} />
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {dish.imageUrl ? (
                              <img 
                                src={dish.imageUrl} 
                                alt={dish.name} 
                                className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                                <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{dish.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{dish.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{dish.price.toFixed(2)}€</Badge>
                            <Switch
                              checked={dish.isAvailable}
                              onCheckedChange={(checked) => updateDishMutation.mutate({ id: dish.id, data: { isAvailable: checked } })}
                              data-testid={`switch-dish-available-${dish.id}`}
                            />
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => duplicateDishMutation.mutate(dish)}
                              disabled={duplicateDishMutation.isPending}
                              data-testid={`button-duplicate-dish-${dish.id}`}
                              title="Dupliquer"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => { setEditingDish(dish); setDishImageUrl(dish.imageUrl || null); setShowDishDialog(true); }}
                              data-testid={`button-edit-dish-${dish.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => deleteDishMutation.mutate(dish.id)}
                              data-testid={`button-delete-dish-${dish.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    />
                    {categoryDishes.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Aucun plat dans cette catégorie</p>
                    )}
                  </CardContent>
                  )}
                </Card>
                );
              }}
            />
            {categories.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucune catégorie. Créez-en une pour ajouter des plats.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Liste des clients</h2>
                <p className="text-sm text-muted-foreground">{customers.length} client(s) enregistré(s)</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/customers"] })}
                data-testid="button-refresh-customers"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>

            {customersLoading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : customers.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead className="text-right">Commandes</TableHead>
                        <TableHead className="text-right">Total dépensé</TableHead>
                        <TableHead>Dernière commande</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow 
                          key={customer.id} 
                          data-testid={`row-customer-${customer.id}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => { setSelectedCustomer(customer); setShowCustomerDialog(true); }}
                        >
                          <TableCell>
                            <div className="font-medium">
                              {customer.firstName || customer.lastName 
                                ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                                : 'Client anonyme'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.address ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-xs truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {customer.address}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{customer.totalOrders}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {customer.totalSpent.toFixed(2)}€
                          </TableCell>
                          <TableCell>
                            {customer.lastOrderDate ? (
                              <span className="text-sm text-muted-foreground">
                                {new Date(customer.lastOrderDate).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun client n'a encore passé de commande</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-4">
            <LoyaltyConfig restaurantId={restaurant?.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Paramètres du restaurant</CardTitle>
                  <Button 
                    onClick={handleSaveBasicInfo}
                    disabled={!basicInfoDirty || updateRestaurantMutation.isPending}
                    data-testid="button-save-basic-info"
                  >
                    {updateRestaurantMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du restaurant</Label>
                    <Input 
                      id="name" 
                      value={settingsName}
                      onChange={(e) => { setSettingsName(e.target.value); setBasicInfoDirty(true); }}
                      data-testid="input-restaurant-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input 
                      id="phone" 
                      value={settingsPhone}
                      onChange={(e) => { setSettingsPhone(e.target.value); setBasicInfoDirty(true); }}
                      data-testid="input-restaurant-phone"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input 
                      id="address" 
                      value={settingsAddress}
                      onChange={(e) => { setSettingsAddress(e.target.value); setBasicInfoDirty(true); }}
                      data-testid="input-restaurant-address"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Horaires de service</Label>
                    {services.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {[...services].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((service) => (
                          <Badge 
                            key={service.id} 
                            variant="secondary"
                            className="flex items-center gap-1"
                            data-testid={`badge-service-${service.id}`}
                          >
                            <Clock className="w-3 h-3" />
                            {service.name}: {service.startTime} - {service.endTime}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucun horaire configuré - commandes acceptées à tout moment
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Configurez vos horaires dans la section "Horaires de service" ci-dessous
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minOrder">Minimum de commande pour la livraison (€)</Label>
                    <Input 
                      id="minOrder" 
                      type="number"
                      step="0.01"
                      value={settingsMinOrder}
                      onChange={(e) => { setSettingsMinOrder(e.target.value); setBasicInfoDirty(true); }}
                      data-testid="input-restaurant-min-order"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Lien de votre restaurant (pour les clients)</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input 
                      readOnly 
                      value={`${window.location.origin}/${restaurant.slug}`}
                      className="flex-1"
                      data-testid="input-restaurant-link"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/${restaurant.slug}`);
                        toast({ title: "Lien copié !" });
                      }}
                      data-testid="button-copy-link"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    URL de votre tableau de bord : <span className="font-mono">{`${window.location.origin}/${restaurant.slug}`}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <CardTitle>Notifications</CardTitle>
                </div>
                <CardDescription>Recevez des alertes quand une nouvelle commande arrive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pushNotifications.isSupported ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notifications push</p>
                      <p className="text-sm text-muted-foreground">
                        {pushNotifications.isSubscribed 
                          ? "Vous recevrez une notification pour chaque nouvelle commande" 
                          : "Activez les notifications pour ne rater aucune commande"}
                      </p>
                    </div>
                    <Button
                      variant={pushNotifications.isSubscribed ? "outline" : "default"}
                      onClick={() => {
                        if (pushNotifications.isSubscribed) {
                          pushNotifications.unsubscribe().then((ok) => {
                            if (ok) toast({ title: "Notifications désactivées" });
                          });
                        } else {
                          pushNotifications.subscribe().then((ok) => {
                            if (ok) toast({ title: "Notifications activées !" });
                            else if (pushNotifications.permission === "denied") {
                              toast({ title: "Notifications bloquées", description: "Autorisez les notifications dans les paramètres de votre navigateur", variant: "destructive" });
                            }
                          });
                        }
                      }}
                      disabled={pushNotifications.isLoading}
                      data-testid="button-toggle-push"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      {pushNotifications.isLoading ? "..." : pushNotifications.isSubscribed ? "Désactiver" : "Activer"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Les notifications push ne sont pas disponibles dans ce navigateur.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <CardTitle>Personnalisation</CardTitle>
                  </div>
                  <Button 
                    onClick={handleSaveBranding}
                    disabled={!brandingDirty || updateRestaurantMutation.isPending}
                    data-testid="button-save-branding"
                  >
                    {updateRestaurantMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
                <CardDescription>Personnalisez l'apparence de votre restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Couleur principale</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="primaryColor" 
                        type="color"
                        value={settingsPrimaryColor}
                        onChange={(e) => { setSettingsPrimaryColor(e.target.value); setBrandingDirty(true); }}
                        className="w-12 h-9 p-1 cursor-pointer"
                        data-testid="input-primary-color"
                      />
                      <Input 
                        value={settingsPrimaryColor}
                        onChange={(e) => { setSettingsPrimaryColor(e.target.value); setBrandingDirty(true); }}
                        className="flex-1 font-mono"
                        data-testid="input-primary-color-hex"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="secondaryColor" 
                        type="color"
                        value={settingsSecondaryColor}
                        onChange={(e) => { setSettingsSecondaryColor(e.target.value); setBrandingDirty(true); }}
                        className="w-12 h-9 p-1 cursor-pointer"
                        data-testid="input-secondary-color"
                      />
                      <Input 
                        value={settingsSecondaryColor}
                        onChange={(e) => { setSettingsSecondaryColor(e.target.value); setBrandingDirty(true); }}
                        className="flex-1 font-mono"
                        data-testid="input-secondary-color-hex"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Couleur d'accent</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="accentColor" 
                        type="color"
                        value={settingsAccentColor}
                        onChange={(e) => { setSettingsAccentColor(e.target.value); setBrandingDirty(true); }}
                        className="w-12 h-9 p-1 cursor-pointer"
                        data-testid="input-accent-color"
                      />
                      <Input 
                        value={settingsAccentColor}
                        onChange={(e) => { setSettingsAccentColor(e.target.value); setBrandingDirty(true); }}
                        className="flex-1 font-mono"
                        data-testid="input-accent-color-hex"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-md border" style={{ backgroundColor: settingsSecondaryColor || "#1e293b" }}>
                  <p style={{ color: settingsPrimaryColor || "#f97316" }} className="font-bold text-lg">Aperçu: {settingsName || restaurant.name}</p>
                  <p style={{ color: "white" }} className="text-sm opacity-80">Voici comment vos couleurs apparaîtront</p>
                  <button 
                    style={{ backgroundColor: settingsAccentColor || "#f97316", color: "white" }}
                    className="mt-2 px-4 py-2 rounded-md font-medium"
                  >
                    Commander
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <CardTitle>Domaine personnalisé</CardTitle>
                  </div>
                  <Button 
                    onClick={handleSaveCustomDomain}
                    disabled={!domainDirty || updateRestaurantMutation.isPending}
                    data-testid="button-save-domain"
                  >
                    {updateRestaurantMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
                <CardDescription>Utilisez votre propre nom de domaine pour votre restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Domaine personnalisé</Label>
                  <Input 
                    id="customDomain" 
                    placeholder="commande.monrestaurant.com"
                    value={settingsCustomDomain}
                    onChange={(e) => { setSettingsCustomDomain(e.target.value); setDomainDirty(true); }}
                    data-testid="input-custom-domain"
                  />
                  <p className="text-sm text-muted-foreground">
                    Contactez le support pour configurer les paramètres DNS de votre domaine personnalisé.
                  </p>
                </div>
              </CardContent>
            </Card>

            <HubRiseCard restaurantId={restaurant?.id} />
            <StripeCard restaurantId={restaurant?.id} />

            {/* Landing Page Builder */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary" />
                    <CardTitle>Page d'accueil</CardTitle>
                  </div>
                  <Button 
                    onClick={handleSaveLandingPage}
                    disabled={!landingPageDirty || updateRestaurantMutation.isPending}
                    data-testid="button-save-landing-page"
                  >
                    {updateRestaurantMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
                <CardDescription>Personnalisez la page d'accueil de votre restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Hero Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Section Hero</h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="showHeroSection" className="text-sm">Afficher</Label>
                      <Switch 
                        id="showHeroSection"
                        checked={showHeroSection}
                        onCheckedChange={(checked) => { setShowHeroSection(checked); setLandingPageDirty(true); }}
                        data-testid="switch-show-hero"
                      />
                    </div>
                  </div>
                  {showHeroSection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                      <div className="space-y-2">
                        <Label htmlFor="heroTitle">Titre principal</Label>
                        <Input 
                          id="heroTitle" 
                          placeholder={restaurant.name}
                          value={heroTitle}
                          onChange={(e) => { setHeroTitle(e.target.value); setLandingPageDirty(true); }}
                          data-testid="input-hero-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heroSubtitle">Sous-titre / Slogan</Label>
                        <Input 
                          id="heroSubtitle" 
                          placeholder="Cuisine traditionnelle depuis 1985"
                          value={heroSubtitle}
                          onChange={(e) => { setHeroSubtitle(e.target.value); setLandingPageDirty(true); }}
                          data-testid="input-hero-subtitle"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heroImageUrl">Image de fond (URL)</Label>
                        <Input 
                          id="heroImageUrl" 
                          placeholder="https://..."
                          value={heroImageUrl}
                          onChange={(e) => { setHeroImageUrl(e.target.value); setLandingPageDirty(true); }}
                          data-testid="input-hero-image"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heroCTAText">Texte du bouton</Label>
                        <Input 
                          id="heroCTAText" 
                          placeholder="Commander maintenant"
                          value={heroCTAText}
                          onChange={(e) => { setHeroCTAText(e.target.value); setLandingPageDirty(true); }}
                          data-testid="input-hero-cta"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* About Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Section À propos</h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="showAboutSection" className="text-sm">Afficher</Label>
                      <Switch 
                        id="showAboutSection"
                        checked={showAboutSection}
                        onCheckedChange={(checked) => { setShowAboutSection(checked); setLandingPageDirty(true); }}
                        data-testid="switch-show-about"
                      />
                    </div>
                  </div>
                  {showAboutSection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="aboutText">Description</Label>
                        <Textarea 
                          id="aboutText" 
                          placeholder="Présentez votre restaurant, son histoire, sa cuisine..."
                          value={aboutText}
                          onChange={(e) => { setAboutText(e.target.value); setLandingPageDirty(true); }}
                          rows={4}
                          data-testid="input-about-text"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="aboutImageUrl">Image (URL)</Label>
                        <Input 
                          id="aboutImageUrl" 
                          placeholder="https://..."
                          value={aboutImageUrl}
                          onChange={(e) => { setAboutImageUrl(e.target.value); setLandingPageDirty(true); }}
                          data-testid="input-about-image"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Visibility Toggles */}
                <div className="space-y-4">
                  <h4 className="font-medium">Sections à afficher</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-md border">
                      <Label htmlFor="showMenuSection" className="cursor-pointer">Menu</Label>
                      <Switch 
                        id="showMenuSection"
                        checked={showMenuSection}
                        onCheckedChange={(checked) => { setShowMenuSection(checked); setLandingPageDirty(true); }}
                        data-testid="switch-show-menu"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md border">
                      <Label htmlFor="showGallerySection" className="cursor-pointer">Galerie</Label>
                      <Switch 
                        id="showGallerySection"
                        checked={showGallerySection}
                        onCheckedChange={(checked) => { setShowGallerySection(checked); setLandingPageDirty(true); }}
                        data-testid="switch-show-gallery"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md border">
                      <Label htmlFor="showContactSection" className="cursor-pointer">Contact</Label>
                      <Switch 
                        id="showContactSection"
                        checked={showContactSection}
                        onCheckedChange={(checked) => { setShowContactSection(checked); setLandingPageDirty(true); }}
                        data-testid="switch-show-contact"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="space-y-4">
                  <h4 className="font-medium">Réseaux sociaux</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebookUrl">Facebook</Label>
                      <Input 
                        id="facebookUrl" 
                        placeholder="https://facebook.com/..."
                        value={facebookUrl}
                        onChange={(e) => { setFacebookUrl(e.target.value); setLandingPageDirty(true); }}
                        data-testid="input-facebook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagramUrl">Instagram</Label>
                      <Input 
                        id="instagramUrl" 
                        placeholder="https://instagram.com/..."
                        value={instagramUrl}
                        onChange={(e) => { setInstagramUrl(e.target.value); setLandingPageDirty(true); }}
                        data-testid="input-instagram"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitterUrl">Twitter / X</Label>
                      <Input 
                        id="twitterUrl" 
                        placeholder="https://twitter.com/..."
                        value={twitterUrl}
                        onChange={(e) => { setTwitterUrl(e.target.value); setLandingPageDirty(true); }}
                        data-testid="input-twitter"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <CardTitle>Zone de livraison</CardTitle>
                </div>
                <CardDescription>Gérez les codes postaux pour lesquels vous effectuez des livraisons</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Input 
                    placeholder="Code postal (ex: 13001)"
                    value={newZipCode}
                    onChange={(e) => setNewZipCode(e.target.value)}
                    className="flex-1 min-w-[150px]"
                    maxLength={10}
                    data-testid="input-new-zip-code"
                  />
                  <Button 
                    onClick={handleAddZipCode}
                    disabled={!newZipCode.trim() || updateRestaurantMutation.isPending}
                    data-testid="button-add-zip-code"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                
                {restaurant.deliveryZipCodes && restaurant.deliveryZipCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {restaurant.deliveryZipCodes.map((zipCode, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                        data-testid={`badge-zip-code-${zipCode}`}
                      >
                        {zipCode}
                        <button
                          onClick={() => handleRemoveZipCode(zipCode)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-zip-${zipCode}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun code postal configuré. Les clients pourront commander sans restriction de zone.
                  </p>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Si aucun code postal n'est ajouté, les clients pourront commander de n'importe où. 
                  Si des codes postaux sont ajoutés, seuls les clients avec une adresse dans ces zones pourront commander en livraison.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <CardTitle>Horaires de service</CardTitle>
                  </div>
                  <Button 
                    size="sm"
                    onClick={openNewServiceDialog}
                    data-testid="button-add-service"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un service
                  </Button>
                </div>
                <CardDescription>Définissez vos horaires d'ouverture (ex: midi, soir). Les commandes ne seront acceptées que pendant ces périodes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {services.length > 0 ? (
                  <div className="space-y-3">
                    {[...services].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((service) => (
                      <div 
                        key={service.id} 
                        className="flex items-center justify-between gap-4 p-3 rounded-md border"
                        data-testid={`service-${service.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {service.startTime} - {service.endTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => openEditServiceDialog(service)}
                            data-testid={`button-edit-service-${service.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => deleteServiceMutation.mutate(service.id)}
                            disabled={deleteServiceMutation.isPending}
                            data-testid={`button-delete-service-${service.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun horaire de service configuré. Les clients pourront commander à tout moment.
                  </p>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Si aucun service n'est ajouté, les commandes seront acceptées à tout moment.
                </p>
              </CardContent>
            </Card>

            <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingService ? "Modifier le service" : "Ajouter un service"}</DialogTitle>
                  <DialogDescription>
                    Définissez un créneau horaire de service (ex: Service du midi, Service du soir)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceName">Nom du service</Label>
                    <Input 
                      id="serviceName"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Ex: Service du midi"
                      data-testid="input-service-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Heure de début</Label>
                      <Input 
                        id="startTime"
                        type="time"
                        value={serviceStartTime}
                        onChange={(e) => setServiceStartTime(e.target.value)}
                        data-testid="input-service-start-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Heure de fin</Label>
                      <Input 
                        id="endTime"
                        type="time"
                        value={serviceEndTime}
                        onChange={(e) => setServiceEndTime(e.target.value)}
                        data-testid="input-service-end-time"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowServiceDialog(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSaveService}
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                    data-testid="button-save-service"
                  >
                    {createServiceMutation.isPending || updateServiceMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="w-5 h-5 text-primary" />
                    <CardTitle>Galerie Photos</CardTitle>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setEditingPhoto(null);
                      setNewPhotoUrl(null);
                      setShowPhotoDialog(true);
                    }}
                    data-testid="button-add-photo"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                <CardDescription>Photos de votre restaurant pour vos clients</CardDescription>
              </CardHeader>
              <CardContent>
                {galleryPhotos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImagePlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune photo dans la galerie</p>
                    <p className="text-sm">Ajoutez des photos pour présenter votre établissement</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {galleryPhotos.map((photo) => (
                      <div key={photo.id} className="relative group" data-testid={`gallery-photo-${photo.id}`}>
                        <img 
                          src={photo.imageUrl} 
                          alt={photo.caption || "Photo du restaurant"} 
                          className="w-full h-24 object-cover rounded-md border"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                          <Button 
                            size="icon" 
                            variant="secondary"
                            onClick={() => {
                              setEditingPhoto(photo);
                              setNewPhotoUrl(photo.imageUrl);
                              setShowPhotoDialog(true);
                            }}
                            data-testid={`button-edit-photo-${photo.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="destructive"
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            data-testid={`button-delete-photo-${photo.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Abonnement
                </CardTitle>
                <CardDescription>Gérez votre abonnement et téléchargez vos factures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground">Plan actuel</div>
                    <div className="text-xl font-bold capitalize">{restaurant?.subscriptionPlan || "starter"}</div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground">Montant mensuel</div>
                    <div className="text-xl font-bold">{(restaurant?.subscriptionPrice || 99).toFixed(2)}€</div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground">Statut</div>
                    <Badge variant={
                      restaurant?.subscriptionStatus === "active" ? "default" :
                      restaurant?.subscriptionStatus === "trial" ? "secondary" : "outline"
                    } className="mt-1">
                      {restaurant?.subscriptionStatus === "active" ? "Actif" : 
                       restaurant?.subscriptionStatus === "trial" ? "Essai" : "En attente"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Historique des factures
                </CardTitle>
                <CardDescription>Téléchargez vos factures au format PDF</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const now = new Date();
                      const invoices = [];
                      for (let i = 0; i < 6; i++) {
                        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        invoices.push({
                          id: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
                          date: date,
                          period: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                          amount: restaurant?.subscriptionPrice || 99,
                          status: i === 0 ? 'pending' : 'paid'
                        });
                      }
                      return invoices.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                          <TableCell>{invoice.date.toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="capitalize">{invoice.period}</TableCell>
                          <TableCell>{invoice.amount.toFixed(2)}€</TableCell>
                          <TableCell>
                            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                              {invoice.status === 'paid' ? 'Payée' : 'En attente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const doc = new jsPDF();
                                
                                doc.setFontSize(20);
                                doc.text("FACTURE", 105, 20, { align: "center" });
                                
                                doc.setFontSize(12);
                                doc.text(`Facture N°: ${invoice.id}`, 20, 40);
                                doc.text(`Date: ${invoice.date.toLocaleDateString('fr-FR')}`, 20, 50);
                                
                                doc.setFontSize(14);
                                doc.text("Émetteur:", 20, 70);
                                doc.setFontSize(11);
                                doc.text("macommande.shop SaaS", 20, 80);
                                doc.text("Service de plateforme de commande en ligne", 20, 87);
                                
                                doc.setFontSize(14);
                                doc.text("Client:", 20, 105);
                                doc.setFontSize(11);
                                doc.text(restaurant?.name || "Restaurant", 20, 115);
                                doc.text(restaurant?.address || "", 20, 122);
                                doc.text(restaurant?.phone || "", 20, 129);
                                
                                doc.setFontSize(12);
                                doc.text("Description", 20, 150);
                                doc.text("Montant", 160, 150);
                                doc.line(20, 155, 190, 155);
                                
                                doc.setFontSize(11);
                                doc.text(`Abonnement ${(restaurant?.subscriptionPlan || 'starter').charAt(0).toUpperCase() + (restaurant?.subscriptionPlan || 'starter').slice(1)}`, 20, 165);
                                doc.text(`Période: ${invoice.period}`, 20, 172);
                                doc.text(`${invoice.amount.toFixed(2)} EUR`, 160, 165);
                                
                                doc.line(20, 185, 190, 185);
                                doc.setFontSize(12);
                                doc.text("Total HT:", 130, 195);
                                doc.text(`${(invoice.amount / 1.20).toFixed(2)} EUR`, 160, 195);
                                doc.text("TVA (20%):", 130, 203);
                                doc.text(`${(invoice.amount - invoice.amount / 1.20).toFixed(2)} EUR`, 160, 203);
                                doc.setFontSize(14);
                                doc.text("Total TTC:", 130, 215);
                                doc.text(`${invoice.amount.toFixed(2)} EUR`, 160, 215);
                                
                                doc.setFontSize(10);
                                doc.text("Merci pour votre confiance!", 105, 250, { align: "center" });
                                
                                doc.save(`facture-${invoice.id}.pdf`);
                                toast({ title: "Facture téléchargée" });
                              }}
                              data-testid={`button-download-invoice-${invoice.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Informations du compte</CardTitle>
                    <CardDescription>Vos informations de connexion</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Nom</p>
                    <p className="font-medium" data-testid="text-account-name">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium" data-testid="text-account-email">{user?.email}</p>
                    </div>
                  </div>
                  {user?.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{user.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Connecte en tant que proprietaire de restaurant</span>
                </div>
              </CardContent>
            </Card>

            <ProPasswordChangeCard
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              passwordError={passwordError}
              handleChangePassword={handleChangePassword}
              isPending={changePasswordMutation.isPending}
            />

            <ProDeleteAccountCard />
          </TabsContent>

        </Tabs>

        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                name: formData.get("name") as string,
                nameEn: formData.get("name") as string,
              };
              if (editingCategory) {
                updateCategoryMutation.mutate({ id: editingCategory.id, data });
              } else {
                createCategoryMutation.mutate(data);
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Nom</Label>
                  <Input id="cat-name" name="name" defaultValue={editingCategory?.name || ""} required data-testid="input-category-name" />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" data-testid="button-save-category">
                  {editingCategory ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showDishDialog} onOpenChange={setShowDishDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDish ? "Modifier le plat" : "Ajouter un plat"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                price: parseFloat(formData.get("price") as string),
                categoryId: formData.get("categoryId") as string,
                imageUrl: dishImageUrl || undefined,
              };
              if (editingDish) {
                updateDishMutation.mutate({ id: editingDish.id, data });
              } else {
                createDishMutation.mutate(data);
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dish-name">Nom</Label>
                  <Input id="dish-name" name="name" defaultValue={editingDish?.name || ""} required data-testid="input-dish-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dish-description">Description</Label>
                  <Textarea id="dish-description" name="description" defaultValue={editingDish?.description || ""} data-testid="input-dish-description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dish-price">Prix (€)</Label>
                  <Input id="dish-price" name="price" type="number" step="0.01" defaultValue={editingDish?.price || ""} required data-testid="input-dish-price" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dish-category">Catégorie</Label>
                  <Select name="categoryId" defaultValue={editingDish?.categoryId || ""}>
                    <SelectTrigger data-testid="select-dish-category">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Image du produit</Label>
                  {dishImageUrl ? (
                    <div className="relative w-full">
                      <img 
                        src={dishImageUrl} 
                        alt="Aperçu du plat" 
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setDishImageUrl(null)}
                        data-testid="button-remove-dish-image"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onComplete={({ objectPath }) => {
                        setDishImageUrl(objectPath);
                        toast({ title: "Image téléchargée" });
                      }}
                      buttonClassName="w-full"
                    >
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Télécharger une image
                    </ObjectUploader>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" data-testid="button-save-dish">
                  {editingDish ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPhoto ? "Modifier la photo" : "Ajouter une photo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const caption = formData.get("caption") as string;
              if (editingPhoto) {
                updatePhotoMutation.mutate({ id: editingPhoto.id, data: { caption: caption || null } });
              } else if (newPhotoUrl) {
                createPhotoMutation.mutate({ imageUrl: newPhotoUrl, caption: caption || undefined });
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Photo</Label>
                  {newPhotoUrl ? (
                    <div className="relative w-full">
                      <img 
                        src={newPhotoUrl} 
                        alt="Preview" 
                        className="w-full h-40 object-cover rounded-md border"
                      />
                      {!editingPhoto && (
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setNewPhotoUrl(null)}
                          data-testid="button-remove-gallery-image"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onComplete={({ objectPath }) => {
                        setNewPhotoUrl(objectPath);
                        toast({ title: "Photo téléchargée" });
                      }}
                      buttonClassName="w-full"
                    >
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Télécharger une photo
                    </ObjectUploader>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo-caption">Légende (optionnel)</Label>
                  <Input 
                    id="photo-caption" 
                    name="caption" 
                    placeholder="Description de la photo"
                    defaultValue={editingPhoto?.caption || ""} 
                    data-testid="input-photo-caption" 
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={!newPhotoUrl && !editingPhoto} data-testid="button-save-photo">
                  {editingPhoto ? "Modifier" : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showCustomerDialog} onOpenChange={(open) => {
          setShowCustomerDialog(open);
          if (!open) {
            setEditingCustomerCredentials(false);
            setCustomerEmail("");
            setCustomerPassword("");
            setShowDeleteCustomerConfirm(false);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Informations client</DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {selectedCustomer.firstName || selectedCustomer.lastName 
                        ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
                        : 'Client anonyme'}
                    </p>
                    <p className="text-sm text-muted-foreground">Client depuis le {selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString('fr-FR') : '-'}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Coordonnées</h4>
                  
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                  
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  
                  {selectedCustomer.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                  )}

                  {!selectedCustomer.email && !selectedCustomer.phone && !selectedCustomer.address && (
                    <p className="text-sm text-muted-foreground italic">Aucune coordonnée enregistrée</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Statistiques</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-md p-3 text-center">
                      <p className="text-2xl font-bold">{selectedCustomer.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Commandes</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-3 text-center">
                      <p className="text-2xl font-bold">{selectedCustomer.totalSpent.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">Total dépensé</p>
                    </div>
                  </div>

                  {selectedCustomer.lastOrderDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Dernière commande le {new Date(selectedCustomer.lastOrderDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Identifiants de connexion</h4>
                    {!editingCustomerCredentials && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingCustomerCredentials(true);
                          setCustomerEmail(selectedCustomer.email || "");
                          setCustomerPassword("");
                        }}
                        data-testid="button-edit-customer-credentials"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                    )}
                  </div>

                  {editingCustomerCredentials ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">Email</Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="nouveau@email.com"
                          data-testid="input-customer-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-password">Nouveau mot de passe</Label>
                        <Input
                          id="customer-password"
                          type="password"
                          value={customerPassword}
                          onChange={(e) => setCustomerPassword(e.target.value)}
                          placeholder="Laisser vide pour ne pas modifier"
                          data-testid="input-customer-password"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCustomerCredentials(false);
                            setCustomerEmail("");
                            setCustomerPassword("");
                          }}
                          data-testid="button-cancel-edit-credentials"
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (customerEmail || customerPassword) {
                              updateCustomerCredentialsMutation.mutate({
                                id: selectedCustomer.id,
                                email: customerEmail || undefined,
                                password: customerPassword || undefined,
                              });
                            }
                          }}
                          disabled={updateCustomerCredentialsMutation.isPending || (!customerEmail && !customerPassword)}
                          data-testid="button-save-customer-credentials"
                        >
                          {updateCustomerCredentialsMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.email ? `Email: ${selectedCustomer.email}` : "Aucun email enregistré"}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-destructive">Zone de danger</h4>
                  
                  {showDeleteCustomerConfirm ? (
                    <div className="space-y-2 p-3 border border-destructive rounded-md">
                      <p className="text-sm">Êtes-vous sûr de vouloir supprimer ce compte client ? Cette action est irréversible.</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteCustomerConfirm(false)}
                          data-testid="button-cancel-delete-customer"
                        >
                          Annuler
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteCustomerMutation.mutate(selectedCustomer.id)}
                          disabled={deleteCustomerMutation.isPending}
                          data-testid="button-confirm-delete-customer"
                        >
                          {deleteCustomerMutation.isPending ? "Suppression..." : "Confirmer la suppression"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteCustomerConfirm(true)}
                      data-testid="button-delete-customer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer ce compte client
                    </Button>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomerDialog(false)} data-testid="button-close-customer-dialog">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {restaurant && user && (
          <ChatMaxAI
            tenantId={restaurant.slug}
            proUserId={user.id || ""}
            proUserName={`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Gerant"}
            restaurantName={restaurant.name}
          />
        )}
      </main>
    </div>
  );
}

function ProPasswordChangeCard({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  handleChangePassword,
  isPending,
}: {
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  passwordError: string;
  handleChangePassword: () => void;
  isPending: boolean;
}) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle>Mot de passe</CardTitle>
            <CardDescription>Modifiez votre mot de passe de connexion</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="pro-currentPassword">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="pro-currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
                disabled={isPending}
                data-testid="input-current-password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pro-newPassword">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="pro-newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 caracteres, lettres et chiffres"
                disabled={isPending}
                data-testid="input-new-password"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pro-confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="pro-confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le nouveau mot de passe"
              disabled={isPending}
              data-testid="input-confirm-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
            data-testid="button-change-password"
          >
            {isPending ? "Modification..." : "Modifier le mot de passe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProDeleteAccountCard() {
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await fetch("/api/my-profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Compte supprime", description: "Votre compte a ete supprime." });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <CardTitle className="text-destructive">Supprimer le compte</CardTitle>
            <CardDescription>Cette action est irreversible. Toutes vos donnees seront supprimees.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!showConfirm ? (
          <Button variant="destructive" onClick={() => setShowConfirm(true)} data-testid="button-show-delete-pro">
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer mon compte
          </Button>
        ) : (
          <div className="space-y-4 max-w-md">
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                Attention : cette action supprimera definitivement votre compte, votre restaurant, vos commandes et toutes vos donnees.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pro-deletePassword">Confirmez avec votre mot de passe</Label>
              <Input
                id="pro-deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe"
                data-testid="input-delete-password-pro"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteAccountMutation.mutate({ password: deletePassword })}
                disabled={deleteAccountMutation.isPending || !deletePassword}
                data-testid="button-confirm-delete-pro"
              >
                {deleteAccountMutation.isPending ? "Suppression..." : "Confirmer la suppression"}
              </Button>
              <Button variant="outline" onClick={() => { setShowConfirm(false); setDeletePassword(""); }} data-testid="button-cancel-delete-pro">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
