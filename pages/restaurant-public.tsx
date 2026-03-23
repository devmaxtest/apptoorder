import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Store, 
  MapPin, 
  Clock, 
  Phone, 
  Loader2,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  UtensilsCrossed,
  ChevronRight,
  ShieldCheck,
  ArrowLeft
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import type { Restaurant, Category, Dish, User as UserType } from "@shared/schema";

interface RestaurantPublicProps {
  slug: string;
}

export default function RestaurantPublic({ slug }: RestaurantPublicProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [rememberMe, setRememberMe] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const { data: user, isLoading: userLoading } = useQuery<UserType | null>({
    queryKey: ["/api/auth/user"],
  });

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants/slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/slug/${slug}`);
      if (!res.ok) throw new Error("Restaurant not found");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "categories"],
    enabled: !!restaurant?.id,
  });

  const { data: dishes = [] } = useQuery<Dish[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "dishes"],
    enabled: !!restaurant?.id,
  });

  useEffect(() => {
    if (user && user.role === "customer" && user.restaurantId === restaurant?.id) {
      setLocation(`/${slug}/client`);
    }
  }, [user, restaurant, slug, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...loginForm,
          slug,
          rememberMe,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Connexion echouee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation(`/${slug}/client`);
    },
    onError: (error: any) => {
      setLoginError(error.message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/client/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registerForm,
          slug,
          rememberMe,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Inscription echouee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Compte cree avec succes" });
      setLocation(`/${slug}/client`);
    },
    onError: (error: any) => {
      setRegisterError(error.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    loginMutation.mutate();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    
    if (!registerForm.firstName.trim()) {
      setRegisterError("Le prenom est requis");
      return;
    }
    if (registerForm.password.length < 6) {
      setRegisterError("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }
    
    registerMutation.mutate();
  };

  const primaryColor = restaurant?.primaryColor || "#f97316";

  if (restaurantLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Restaurant introuvable</h2>
            <p className="text-muted-foreground mb-6">Ce restaurant n'existe pas ou l'adresse est incorrecte.</p>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour a l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableDishes = dishes.filter(d => d.isAvailable);
  const menuPreviewCategories = categories.filter(cat => 
    availableDishes.some(d => d.categoryId === cat.id)
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="relative w-full overflow-hidden"
        style={{ 
          background: restaurant.heroImageUrl 
            ? undefined 
            : `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}08 50%, ${primaryColor}15 100%)`
        }}
      >
        {restaurant.heroImageUrl && (
          <div className="absolute inset-0">
            <img
              src={restaurant.heroImageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
        )}

        <div className="relative z-10">
          <header className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {restaurant.logoUrl ? (
                <img 
                  src={restaurant.logoUrl} 
                  alt={restaurant.name} 
                  className="h-12 w-12 rounded-xl object-cover border-2 border-white/20 shadow-lg"
                  data-testid="img-restaurant-logo"
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <UtensilsCrossed className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className={`font-bold text-xl ${restaurant.heroImageUrl ? 'text-white' : 'text-foreground'}`}>
                  {restaurant.name}
                </h1>
                {restaurant.isOpen ? (
                  <Badge className="text-xs" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                    Ouvert
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Ferme</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          <div className="container mx-auto px-4 py-8 md:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              <div className={`space-y-6 ${restaurant.heroImageUrl ? 'text-white' : ''}`}>
                <div>
                  <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${restaurant.heroImageUrl ? 'text-white' : 'text-foreground'}`}>
                    {restaurant.heroTitle || `Bienvenue chez ${restaurant.name}`}
                  </h2>
                  {restaurant.heroSubtitle && (
                    <p className={`text-lg ${restaurant.heroImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {restaurant.heroSubtitle}
                    </p>
                  )}
                </div>

                <div className={`space-y-3 ${restaurant.heroImageUrl ? 'text-white/90' : 'text-foreground'}`}>
                  {restaurant.address && (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{restaurant.address}</span>
                    </div>
                  )}
                  {restaurant.phone && (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur flex items-center justify-center flex-shrink-0">
                        <Phone className="h-4 w-4" />
                      </div>
                      <a href={`tel:${restaurant.phone}`} className="text-sm hover:underline">{restaurant.phone}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-sm">{restaurant.openTime} - {restaurant.closeTime}</span>
                  </div>
                  {restaurant.deliveryMinOrder && restaurant.deliveryMinOrder > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Commande minimum : {restaurant.deliveryMinOrder.toFixed(2)} EUR</span>
                    </div>
                  )}
                </div>

                {(restaurant.facebookUrl || restaurant.instagramUrl || restaurant.twitterUrl) && (
                  <div className="flex gap-2 pt-2">
                    {restaurant.facebookUrl && (
                      <a href={restaurant.facebookUrl} target="_blank" rel="noopener noreferrer">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`rounded-xl ${restaurant.heroImageUrl ? 'border-white/20 text-white hover:bg-white/10' : ''}`}
                          data-testid="link-facebook"
                        >
                          <SiFacebook className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {restaurant.instagramUrl && (
                      <a href={restaurant.instagramUrl} target="_blank" rel="noopener noreferrer">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`rounded-xl ${restaurant.heroImageUrl ? 'border-white/20 text-white hover:bg-white/10' : ''}`}
                          data-testid="link-instagram"
                        >
                          <SiInstagram className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {restaurant.twitterUrl && (
                      <a href={restaurant.twitterUrl} target="_blank" rel="noopener noreferrer">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`rounded-xl ${restaurant.heroImageUrl ? 'border-white/20 text-white hover:bg-white/10' : ''}`}
                          data-testid="link-twitter"
                        >
                          <SiX className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
                <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-xl">
                  <CardHeader className="text-center pb-2 pt-8">
                    <div 
                      className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <User className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl">Espace Client</CardTitle>
                    <CardDescription className="text-sm">
                      Connectez-vous ou creez un compte pour commander
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-8 px-6">
                    <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "register")}>
                      <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                        <TabsTrigger value="login" className="text-sm" data-testid="tab-login">
                          <LogIn className="h-4 w-4 mr-2" />
                          Connexion
                        </TabsTrigger>
                        <TabsTrigger value="register" className="text-sm" data-testid="tab-register">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Inscription
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="login">
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="votre@email.com"
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              required
                              className="h-11"
                              data-testid="input-login-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="login-password" className="text-sm font-medium">Mot de passe</Label>
                            <div className="relative">
                              <Input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Votre mot de passe"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                required
                                className="h-11 pr-10"
                                data-testid="input-login-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="remember-me-login"
                              checked={rememberMe}
                              onCheckedChange={(checked) => setRememberMe(checked === true)}
                              data-testid="checkbox-remember-me"
                            />
                            <Label htmlFor="remember-me-login" className="text-sm font-normal cursor-pointer">
                              Se souvenir de moi
                            </Label>
                          </div>
                          {loginError && (
                            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{loginError}</p>
                          )}
                          <Button 
                            type="submit" 
                            className="w-full h-11 text-sm font-semibold"
                            style={{ backgroundColor: primaryColor }}
                            disabled={loginMutation.isPending}
                            data-testid="button-login"
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Connexion...</span>
                              </>
                            ) : (
                              <>
                                <span className="whitespace-nowrap">Se connecter</span>
                                <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0" />
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="register">
                        <form onSubmit={handleRegister} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="register-firstname" className="text-sm font-medium">Prenom *</Label>
                              <Input
                                id="register-firstname"
                                placeholder="Sophie"
                                value={registerForm.firstName}
                                onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                                required
                                className="h-11"
                                data-testid="input-register-firstname"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="register-lastname" className="text-sm font-medium">Nom</Label>
                              <Input
                                id="register-lastname"
                                placeholder="Martin"
                                value={registerForm.lastName}
                                onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                                className="h-11"
                                data-testid="input-register-lastname"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="register-email" className="text-sm font-medium">Email *</Label>
                            <Input
                              id="register-email"
                              type="email"
                              placeholder="votre@email.com"
                              value={registerForm.email}
                              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                              required
                              className="h-11"
                              data-testid="input-register-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="register-password" className="text-sm font-medium">Mot de passe *</Label>
                            <div className="relative">
                              <Input
                                id="register-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="6 caracteres minimum"
                                value={registerForm.password}
                                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                required
                                className="h-11 pr-10"
                                data-testid="input-register-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="register-phone" className="text-sm font-medium">Telephone</Label>
                              <Input
                                id="register-phone"
                                placeholder="06 12 34 56 78"
                                value={registerForm.phone}
                                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                                className="h-11"
                                data-testid="input-register-phone"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="register-address" className="text-sm font-medium">Adresse</Label>
                              <Input
                                id="register-address"
                                placeholder="12 rue de Paris"
                                value={registerForm.address}
                                onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                                className="h-11"
                                data-testid="input-register-address"
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="remember-me-register"
                              checked={rememberMe}
                              onCheckedChange={(checked) => setRememberMe(checked === true)}
                              data-testid="checkbox-remember-me-register"
                            />
                            <Label htmlFor="remember-me-register" className="text-sm font-normal cursor-pointer">
                              Se souvenir de moi
                            </Label>
                          </div>
                          {registerError && (
                            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{registerError}</p>
                          )}
                          <Button 
                            type="submit" 
                            className="w-full h-11 text-sm font-semibold"
                            style={{ backgroundColor: primaryColor }}
                            disabled={registerMutation.isPending}
                            data-testid="button-register"
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Inscription...</span>
                              </>
                            ) : (
                              <>
                                <span className="whitespace-nowrap">Creer mon compte</span>
                                <ChevronRight className="h-4 w-4 ml-1 flex-shrink-0" />
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {restaurant.aboutText && restaurant.showAboutSection && (
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-2xl">
            <h3 className="text-xl font-bold mb-3">A propos</h3>
            <p className="text-muted-foreground leading-relaxed">{restaurant.aboutText}</p>
          </div>
        </section>
      )}

      {menuPreviewCategories.length > 0 && availableDishes.length > 0 && (
        <section className="bg-muted/30 dark:bg-muted/10 py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Notre Menu</h3>
                <p className="text-sm text-muted-foreground">Connectez-vous pour passer commande</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuPreviewCategories.map((cat) => {
                const categoryDishes = availableDishes.filter(d => d.categoryId === cat.id);
                return (
                  <Card key={cat.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {categoryDishes.slice(0, 3).map((dish) => (
                          <div key={dish.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2">
                              {dish.imageUrl && (
                                <img src={dish.imageUrl} alt={dish.name} className="h-8 w-8 rounded-md object-cover" />
                              )}
                              <span className="font-medium">{dish.name}</span>
                            </div>
                            <span className="font-semibold" style={{ color: primaryColor }}>{dish.price.toFixed(2)} EUR</span>
                          </div>
                        ))}
                        {categoryDishes.length > 3 && (
                          <p className="text-xs text-muted-foreground pt-1">
                            +{categoryDishes.length - 3} autres plats
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{restaurant.name} — Propulse par macommande.shop</p>
        </div>
      </footer>
    </div>
  );
}
