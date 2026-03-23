import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Store, 
  ShoppingBag, 
  LogOut, 
  User,
  Search,
  Clock,
  MapPin,
  History,
  Heart,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  Save,
  Phone,
  Key,
  Shield,
  Trash2,
  Mail,
  AlertTriangle,
  Eye,
  EyeOff,
  Gift,
  Star,
  ArrowRight
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Restaurant, Order } from "@shared/schema";

interface AuthUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  phone?: string;
  address?: string;
  claims?: {
    sub: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

function ClientLoyaltyPanel({ userId }: { userId?: string }) {
  const { toast } = useToast();

  const restaurantsQuery = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const restaurants = restaurantsQuery.data || [];
  const loyaltyRestaurants = restaurants.filter((r) => r.loyaltyEnabled);

  if (!userId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Connectez-vous pour voir vos points de fidélité</p>
        </CardContent>
      </Card>
    );
  }

  if (loyaltyRestaurants.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun programme de fidélité disponible pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Gift className="w-5 h-5" />
        Mes points de fidélité
      </h2>
      {loyaltyRestaurants.map((restaurant) => (
        <LoyaltyCard key={restaurant.id} restaurant={restaurant} userId={userId} />
      ))}
    </div>
  );
}

function LoyaltyCard({ restaurant, userId }: { restaurant: Restaurant; userId: string }) {
  const { toast } = useToast();

  const loyaltyQuery = useQuery<{
    points: number;
    totalEarned: number;
    totalRedeemed: number;
    config: { enabled: boolean; pointsPerEuro: number; pointsToRedeem: number; rewardValue: number } | null;
  }>({
    queryKey: ["/api/loyalty", restaurant.id],
    queryFn: async () => {
      const res = await fetch(`/api/loyalty/${restaurant.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/loyalty/${restaurant.id}/redeem`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Réduction de ${data.rewardValue.toFixed(2)}€ débloquée !` });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty", restaurant.id] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const data = loyaltyQuery.data;
  const config = data?.config;
  if (!config || !config.enabled) return null;

  const points = data?.points ?? 0;
  const progress = Math.min(100, (points / config.pointsToRedeem) * 100);
  const canRedeem = points >= config.pointsToRedeem;

  return (
    <Card data-testid={`card-loyalty-${restaurant.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {restaurant.logoUrl && (
            <img src={restaurant.logoUrl} alt="" className="w-6 h-6 rounded" />
          )}
          {restaurant.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold" data-testid={`text-loyalty-points-${restaurant.id}`}>
              {points}
            </p>
            <p className="text-sm text-muted-foreground">points</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {config.pointsToRedeem} pts = {config.rewardValue.toFixed(2)}€ de réduction
            </p>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
            data-testid={`progress-loyalty-${restaurant.id}`}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {canRedeem
            ? "Vous pouvez utiliser vos points !"
            : `Encore ${config.pointsToRedeem - points} points avant votre récompense`}
        </p>

        {canRedeem && (
          <Button
            className="w-full"
            onClick={() => redeemMutation.mutate()}
            disabled={redeemMutation.isPending}
            data-testid={`button-redeem-${restaurant.id}`}
          >
            <Star className="w-4 h-4 mr-2" />
            Utiliser {config.pointsToRedeem} points ({config.rewardValue.toFixed(2)}€ de réduction)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: ""
  });
  const [originalProfile, setOriginalProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: ""
  });

  const { data: user, isLoading: userLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
  });

  // Initialize profile form when user data loads
  useEffect(() => {
    if (user) {
      const firstName = user.firstName || user.claims?.first_name || "";
      const lastName = user.lastName || user.claims?.last_name || "";
      const phone = user.phone || "";
      const address = user.address || "";
      
      setProfileForm({ firstName, lastName, phone, address });
      setOriginalProfile({ firstName, lastName, phone, address });
    }
  }, [user]);

  const { data: restaurants = [], isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: myOrders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/my-orders"],
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const response = await apiRequest("PATCH", "/api/my-profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées." });
      setOriginalProfile(profileForm);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le profil.", variant: "destructive" });
    }
  });

  const hasProfileChanges = 
    profileForm.firstName !== originalProfile.firstName ||
    profileForm.lastName !== originalProfile.lastName ||
    profileForm.phone !== originalProfile.phone ||
    profileForm.address !== originalProfile.address;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.address && r.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openRestaurants = filteredRestaurants.filter(r => r.isOpen);
  const closedRestaurants = filteredRestaurants.filter(r => !r.isOpen);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              <h1 className="font-bold text-xl">macommande.shop</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={handleLogin} data-testid="button-client-login">
                Sign In
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Order from your favorite restaurants</h2>
            <p className="text-muted-foreground">Sign in to track orders and save favorites</p>
          </div>

          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
                data-testid="input-search-restaurants"
              />
            </div>
          </div>

          {restaurantsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {openRestaurants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Open Now</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {openRestaurants.map(restaurant => (
                      <Card 
                        key={restaurant.id} 
                        className="cursor-pointer hover-elevate overflow-visible"
                        onClick={() => setLocation(`/${restaurant.slug}`)}
                        data-testid={`card-restaurant-${restaurant.id}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                            <Badge variant="default">Open</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {restaurant.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {restaurant.address}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {restaurant.openTime} - {restaurant.closeTime}
                          </p>
                          {restaurant.deliveryMinOrder && (
                            <p className="text-sm mt-2">
                              Min. order: <span className="font-medium">{restaurant.deliveryMinOrder}€</span>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {closedRestaurants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Currently Closed</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {closedRestaurants.map(restaurant => (
                      <Card 
                        key={restaurant.id} 
                        className="cursor-pointer opacity-60 overflow-visible"
                        onClick={() => setLocation(`/${restaurant.slug}`)}
                        data-testid={`card-restaurant-closed-${restaurant.id}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                            <Badge variant="secondary">Closed</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {restaurant.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {restaurant.address}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {restaurant.openTime} - {restaurant.closeTime}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {filteredRestaurants.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No restaurants found</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-primary" />
            <h1 className="font-bold text-xl">macommande.shop</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {user.claims?.first_name || "User"} {user.claims?.last_name || ""}
            </span>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-client-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="restaurants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restaurants" data-testid="tab-restaurants">
              <Store className="w-4 h-4 mr-2" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-my-orders">
              <History className="w-4 h-4 mr-2" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="loyalty" data-testid="tab-loyalty">
              <Gift className="w-4 h-4 mr-2" />
              Fidélité
            </TabsTrigger>
            <TabsTrigger value="account" data-testid="tab-account">
              <User className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="space-y-4">
            <div className="max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-restaurants-logged"
                />
              </div>
            </div>

            {restaurantsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {openRestaurants.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Open Now</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {openRestaurants.map(restaurant => (
                        <Card 
                          key={restaurant.id} 
                          className="cursor-pointer hover-elevate overflow-visible"
                          onClick={() => setLocation(`/${restaurant.slug}`)}
                          data-testid={`card-restaurant-${restaurant.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                              <Badge variant="default">Open</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {restaurant.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {restaurant.address}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-4 h-4" />
                              {restaurant.openTime} - {restaurant.closeTime}
                            </p>
                            {restaurant.deliveryMinOrder && (
                              <p className="text-sm mt-2">
                                Min. order: <span className="font-medium">{restaurant.deliveryMinOrder}€</span>
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {closedRestaurants.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Currently Closed</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {closedRestaurants.map(restaurant => (
                        <Card 
                          key={restaurant.id} 
                          className="cursor-pointer opacity-60 overflow-visible"
                          onClick={() => setLocation(`/${restaurant.slug}`)}
                          data-testid={`card-restaurant-closed-${restaurant.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                              <Badge variant="secondary">Closed</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {restaurant.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {restaurant.address}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-xl font-semibold">Order History</h2>
            
            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : myOrders.length > 0 ? (
              <div className="space-y-4">
                {myOrders.map(order => {
                  const items = JSON.parse(order.items || "[]");
                  return (
                    <Card 
                      key={order.id} 
                      className="cursor-pointer hover-elevate overflow-visible"
                      onClick={() => setLocation(`/order/${order.id}`)}
                      data-testid={`card-order-${order.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <CardTitle className="text-base">Order #{order.id.slice(0, 8)}</CardTitle>
                            <CardDescription>
                              {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
                            </CardDescription>
                          </div>
                          <Badge variant={
                            order.status === "completed" ? "default" :
                            order.status === "pending" ? "secondary" :
                            order.status === "cancelled" ? "destructive" : "outline"
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-sm text-muted-foreground">{items.length} items</p>
                            <p className="text-sm">{order.orderType === "delivery" ? "Delivery" : "Pickup"}</p>
                          </div>
                          <p className="text-lg font-semibold">{order.total.toFixed(2)}€</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      const tabTrigger = document.querySelector('[data-testid="tab-restaurants"]') as HTMLButtonElement;
                      tabTrigger?.click();
                    }}
                    data-testid="button-browse-restaurants"
                  >
                    Browse Restaurants
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-4">
            <ClientLoyaltyPanel userId={user?.id} />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>Gerez votre profil et vos coordonnees</CardDescription>
                </div>
                {hasProfileChanges && (
                  <Button 
                    onClick={() => updateProfileMutation.mutate(profileForm)}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  {(user.profileImageUrl || user.claims?.profile_image_url) ? (
                    <img 
                      src={user.profileImageUrl || user.claims?.profile_image_url} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {profileForm.firstName || "Utilisateur"} {profileForm.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email || "Non renseigne"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom</Label>
                    <Input
                      id="firstName"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Votre prenom"
                      data-testid="input-profile-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Votre nom"
                      data-testid="input-profile-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+33 6 12 34 56 78"
                      className="pl-10"
                      data-testid="input-profile-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse de livraison</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Votre adresse complete"
                      className="pl-10"
                      data-testid="input-profile-address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <PasswordChangeCard />

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Session et securite</CardTitle>
                    <CardDescription>Gerez votre session active</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  data-testid="button-logout-account"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Se deconnecter
                </Button>
              </CardContent>
            </Card>

            <DeleteAccountCard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PasswordChangeCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/my-profile/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mot de passe modifie", description: "Votre mot de passe a ete mis a jour." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de changer le mot de passe", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

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
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
                data-testid="input-current-password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caracteres"
                data-testid="input-new-password"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le nouveau mot de passe"
              data-testid="input-confirm-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending ? "Modification..." : "Modifier le mot de passe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteAccountCard() {
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
          <Button variant="destructive" onClick={() => setShowConfirm(true)} data-testid="button-show-delete">
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer mon compte
          </Button>
        ) : (
          <div className="space-y-4 max-w-md">
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                Attention : cette action supprimera definitivement votre compte, votre historique de commandes et toutes vos donnees.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Confirmez avec votre mot de passe</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe"
                data-testid="input-delete-password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteAccountMutation.mutate({ password: deletePassword })}
                disabled={deleteAccountMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? "Suppression..." : "Confirmer la suppression"}
              </Button>
              <Button variant="outline" onClick={() => { setShowConfirm(false); setDeletePassword(""); }} data-testid="button-cancel-delete">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
