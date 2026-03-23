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
import { useToast } from "@/hooks/use-toast";
import { useOrderSync, useVisibilityRefresh } from "@/hooks/use-order-sync";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Store, 
  MapPin, 
  Clock, 
  Phone, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2,
  Search,
  User,
  LogOut,
  Eye,
  EyeOff,
  History,
  Download,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell
} from "lucide-react";
import type { Restaurant, Category, Dish, Order, User as UserType } from "@shared/schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface CartItem {
  dish: Dish;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  restaurantId: string | null;
  addItem: (dish: Dish, restaurantId: string) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[], restaurantId: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      addItem: (dish, restaurantId) => {
        const { items, restaurantId: currentRestaurantId } = get();
        if (currentRestaurantId && currentRestaurantId !== restaurantId) {
          set({ items: [{ dish, quantity: 1 }], restaurantId });
          return;
        }
        const existing = items.find((item) => item.dish.id === dish.id);
        if (existing) {
          set({
            items: items.map((item) =>
              item.dish.id === dish.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            restaurantId,
          });
        } else {
          set({ items: [...items, { dish, quantity: 1 }], restaurantId });
        }
      },
      removeItem: (dishId) => {
        set({ items: get().items.filter((item) => item.dish.id !== dishId) });
      },
      updateQuantity: (dishId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(dishId);
        } else {
          set({
            items: get().items.map((item) =>
              item.dish.id === dishId ? { ...item, quantity } : item
            ),
          });
        }
      },
      clearCart: () => set({ items: [], restaurantId: null }),
      setItems: (items, restaurantId) => set({ items, restaurantId }),
      getTotal: () =>
        get().items.reduce(
          (total, item) => total + item.dish.price * item.quantity,
          0
        ),
      getItemCount: () =>
        get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    { name: "client-restaurant-cart" }
  )
);

interface ClientRestaurantPortalProps {
  slug: string;
}

export default function ClientRestaurantPortal({ slug }: ClientRestaurantPortalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const cart = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("delivery");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
  });
  
  const [deliveryForm, setDeliveryForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerZipCode: "",
  });

  const pushNotifications = usePushNotifications();

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

  const isValidClient = !!(user && 
    user.role === "customer" && 
    user.restaurantId === restaurant?.id);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "categories"],
    enabled: !!restaurant?.id && isValidClient,
  });

  const { data: dishes = [] } = useQuery<Dish[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "dishes"],
    enabled: !!restaurant?.id && isValidClient,
  });

  const { data: myOrders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/my-orders"],
    enabled: !!user && isValidClient,
  });

  useOrderSync({ restaurantId: restaurant?.id, userId: user?.id, role: "customer", enabled: isValidClient });
  useVisibilityRefresh([["/api/my-orders"]]);

  useEffect(() => {
    if (!userLoading && !restaurantLoading && restaurant) {
      if (!user) {
        setLocation(`/${slug}`);
      } else if (!isValidClient) {
        setLocation(`/${slug}`);
      }
    }
  }, [user, userLoading, restaurant, restaurantLoading, isValidClient, slug, setLocation]);

  useEffect(() => {
    if (user) {
      setDeliveryForm(prev => ({
        ...prev,
        customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        customerPhone: user.phone || "",
        customerAddress: user.address || "",
      }));
      setAccountForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone: string; address: string }) => {
      return apiRequest("PATCH", "/api/my-profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setAccountDialogOpen(false);
      toast({
        title: "Profil mis a jour",
        description: "Vos informations ont ete enregistrees.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre a jour le profil",
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      restaurantId: string;
      items: { dishId: string; quantity: number }[];
      orderType: "delivery" | "takeaway";
      customerName: string;
      customerPhone: string;
      customerAddress?: string;
    }) => {
      return apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      cart.clearCart();
      setCheckoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/my-orders"] });
      toast({
        title: "Commande passee",
        description: "Votre commande a ete envoyee au restaurant.",
      });
      setActiveTab("orders");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de passer la commande",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      window.location.href = `/${slug}`;
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCheckout = () => {
    if (!restaurant) return;

    if (orderType === "delivery") {
      if (!deliveryForm.customerZipCode) {
        toast({
          title: "Code postal requis",
          description: "Veuillez entrer votre code postal",
          variant: "destructive",
        });
        return;
      }

      const validZipCodes = restaurant.deliveryZipCodes || [];
      if (validZipCodes.length > 0 && !validZipCodes.includes(deliveryForm.customerZipCode)) {
        toast({
          title: "Zone non desservie",
          description: "Nous ne livrons pas dans cette zone",
          variant: "destructive",
        });
        return;
      }

      if (restaurant.deliveryMinOrder && cart.getTotal() < restaurant.deliveryMinOrder) {
        toast({
          title: "Minimum de commande",
          description: `Le minimum de commande est de ${restaurant.deliveryMinOrder.toFixed(2)} EUR`,
          variant: "destructive",
        });
        return;
      }
    }

    createOrderMutation.mutate({
      restaurantId: restaurant.id,
      items: cart.items.map((item) => ({
        dishId: item.dish.id,
        quantity: item.quantity,
      })),
      orderType,
      customerName: deliveryForm.customerName,
      customerPhone: deliveryForm.customerPhone,
      customerAddress: orderType === "delivery" ? `${deliveryForm.customerAddress}, ${deliveryForm.customerZipCode}` : undefined,
    });
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dish.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || dish.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && dish.isAvailable;
  });

  const getStatusBadge = (status: string, orderType?: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "secondary" },
      confirmed: { label: "Confirmee", variant: "default" },
      preparing: { label: "En preparation", variant: "default" },
      ready: { label: "Prete", variant: "default" },
      delivered: { label: orderType === "takeaway" ? "Récuperée" : "Livrée", variant: "outline" },
      cancelled: { label: "Annulee", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleReorder = (order: Order) => {
    if (!restaurant) return;
    
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const cartItems: CartItem[] = [];
    
    for (const item of orderItems as Array<{ dishId?: string; name: string; quantity: number; price: number }>) {
      const dish = dishes.find(d => d.id === item.dishId || d.name === item.name);
      if (dish && dish.isAvailable) {
        cartItems.push({ dish, quantity: item.quantity });
      }
    }
    
    if (cartItems.length === 0) {
      toast({
        title: "Produits indisponibles",
        description: "Les produits de cette commande ne sont plus disponibles",
        variant: "destructive",
      });
      return;
    }
    
    cart.setItems(cartItems, restaurant.id);
    setActiveTab("menu");
    toast({
      title: "Panier mis à jour",
      description: `${cartItems.length} article(s) ajouté(s) au panier`,
    });
  };

  if (userLoading || restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Restaurant introuvable</h2>
            <p className="text-muted-foreground mb-4">Ce restaurant n'existe pas.</p>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              Retour a l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !isValidClient) {
    return null;
  }

  const restaurantOrders = myOrders
    .filter(order => order.restaurantId === restaurant.id)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const activeStatuses = ["pending", "confirmed", "preparing", "ready"];
  const activeOrdersCount = restaurantOrders.filter(o => activeStatuses.includes(o.status)).length;

  const deliveredStatuses = ["delivered", "completed"];

  const filteredOrders = restaurantOrders.filter(order => {
    if (orderFilter === "all") return true;
    if (orderFilter === "active") return activeStatuses.includes(order.status);
    if (orderFilter === "delivered") return deliveredStatuses.includes(order.status);
    if (orderFilter === "cancelled") return order.status === "cancelled";
    return true;
  });

  const parseOrderItems = (items: string | unknown): Array<{ dishId?: string; name: string; quantity: number; price: number }> => {
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      case "confirmed": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "preparing": return <Package className="h-4 w-4 text-orange-500" />;
      case "ready": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "delivered":
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "cancelled": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            {restaurant.logoUrl ? (
              <img 
                src={restaurant.logoUrl} 
                alt={restaurant.name} 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <Store className="h-8 w-8 text-primary" />
            )}
            <div>
              <h1 className="font-bold text-lg">{restaurant.name}</h1>
              <p className="text-xs text-muted-foreground">
                Bienvenue, {user.firstName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative" data-testid="button-open-cart">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Panier
                  {cart.getItemCount() > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cart.getItemCount()}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Votre panier</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {cart.items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Votre panier est vide</p>
                  ) : (
                    <>
                      {cart.items.map((item) => (
                        <div key={item.dish.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.dish.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.dish.price.toFixed(2)} EUR
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => cart.updateQuantity(item.dish.id, item.quantity - 1)}
                              data-testid={`button-decrease-${item.dish.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => cart.updateQuantity(item.dish.id, item.quantity + 1)}
                              data-testid={`button-increase-${item.dish.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cart.removeItem(item.dish.id)}
                              data-testid={`button-remove-${item.dish.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-semibold mb-4">
                          <span>Total</span>
                          <span>{cart.getTotal().toFixed(2)} EUR</span>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => setCheckoutOpen(true)}
                          data-testid="button-checkout"
                        >
                          Commander
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAccountDialogOpen(true)}
              data-testid="button-mon-compte"
            >
              <User className="h-4 w-4 mr-2" />
              Mon compte
            </Button>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        {restaurant.aboutText && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-muted-foreground" data-testid="text-restaurant-description">
                {restaurant.aboutText}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "menu" ? "default" : "outline"}
            onClick={() => setActiveTab("menu")}
            data-testid="tab-menu"
          >
            <Store className="h-4 w-4 mr-2" />
            Menu
          </Button>
          <Button
            variant={activeTab === "orders" ? "default" : "outline"}
            onClick={() => setActiveTab("orders")}
            data-testid="tab-orders"
            className="relative"
          >
            <History className="h-4 w-4 mr-2" />
            Mes commandes
            {activeOrdersCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold" data-testid="badge-active-orders-count">
                {activeOrdersCount}
              </span>
            )}
          </Button>
        </div>

        {activeTab === "menu" && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-dishes"
                />
              </div>
            </div>

            <div className="relative mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="button-category-all"
                >
                  Tout
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => setSelectedCategory(cat.id)}
                    data-testid={`button-category-${cat.id}`}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
            </div>

            {selectedCategory === null && !searchTerm ? (
              <div className="space-y-6">
                {categories.map((cat) => {
                  const categoryDishes = dishes.filter((d) => d.categoryId === cat.id && d.isAvailable);
                  if (categoryDishes.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <h2 className="text-lg font-semibold mb-3" data-testid={`title-category-${cat.id}`}>{cat.name}</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categoryDishes.map((dish) => (
                          <Card key={dish.id} className="overflow-visible" data-testid={`card-dish-${dish.id}`}>
                            {dish.imageUrl && (
                              <div 
                                className="aspect-[4/3] relative overflow-hidden rounded-t-md cursor-pointer"
                                onClick={() => setSelectedDish(dish)}
                                data-testid={`image-dish-${dish.id}`}
                              >
                                <img
                                  src={dish.imageUrl}
                                  alt={dish.name}
                                  className="w-full h-full object-cover transition-transform hover:scale-105"
                                />
                              </div>
                            )}
                            <CardContent className="p-2 sm:p-3">
                              <h3 className="font-semibold text-sm line-clamp-1 mb-1">{dish.name}</h3>
                              <p className="text-sm font-medium text-primary mb-2">{dish.price.toFixed(2)} EUR</p>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  cart.addItem(dish, restaurant.id);
                                  toast({ title: "Ajoute au panier" });
                                }}
                                data-testid={`button-add-dish-${dish.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Ajouter
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredDishes.map((dish) => (
                  <Card key={dish.id} className="overflow-visible" data-testid={`card-dish-${dish.id}`}>
                    {dish.imageUrl && (
                      <div 
                        className="aspect-[4/3] relative overflow-hidden rounded-t-md cursor-pointer"
                        onClick={() => setSelectedDish(dish)}
                        data-testid={`image-dish-${dish.id}`}
                      >
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>
                    )}
                    <CardContent className="p-2 sm:p-3">
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1">{dish.name}</h3>
                      <p className="text-sm font-medium text-primary mb-2">{dish.price.toFixed(2)} EUR</p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          cart.addItem(dish, restaurant.id);
                          toast({ title: "Ajoute au panier" });
                        }}
                        data-testid={`button-add-dish-${dish.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredDishes.length === 0 && (selectedCategory !== null || searchTerm) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun plat trouve</p>
              </div>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-semibold" data-testid="text-orders-title">Mes commandes</h2>
              <span className="text-sm text-muted-foreground" data-testid="text-orders-count">
                {restaurantOrders.length} commande{restaurantOrders.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap" data-testid="order-filter-tabs">
              {([
                { key: "all" as const, label: "Toutes", count: 0 },
                { key: "active" as const, label: "En cours", count: activeOrdersCount },
                { key: "delivered" as const, label: "Livrées", count: 0 },
                { key: "cancelled" as const, label: "Annulées", count: 0 },
              ]).map(({ key, label, count }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={orderFilter === key ? "default" : "outline"}
                  onClick={() => setOrderFilter(key)}
                  data-testid={`button-filter-${key}`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary-foreground text-primary text-xs font-bold">
                      {count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {orderFilter === "all"
                      ? "Vous n'avez pas encore passé de commande"
                      : orderFilter === "active"
                      ? "Aucune commande en cours"
                      : orderFilter === "delivered"
                      ? "Aucune commande livrée"
                      : "Aucune commande annulée"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const orderItems = parseOrderItems(order.items);
                  const isActive = activeStatuses.includes(order.status);

                  return (
                    <Card
                      key={order.id}
                      className={`transition-all ${isActive ? "border-primary/40 shadow-sm" : ""}`}
                      data-testid={`card-order-${order.id}`}
                    >
                      <CardContent className="p-0">
                        <button
                          className="w-full p-4 text-left cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          data-testid={`button-expand-order-${order.id}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="mt-0.5">
                                {getStatusIcon(order.status)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm" data-testid={`text-order-ref-${order.id}`}>
                                  Commande #{order.id.slice(-6)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }) : ""}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {order.orderType === "delivery" ? "Livraison" : "À emporter"}
                                  {order.customerAddress && ` · ${order.customerAddress}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(order.status, order.orderType)}
                              <Badge variant="outline" className="font-semibold" data-testid={`text-order-total-${order.id}`}>
                                {order.total?.toFixed(2)} €
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t" data-testid={`section-order-details-${order.id}`}>
                            <div className="pt-3 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Articles commandés</p>
                              <div className="divide-y">
                                {orderItems.map((item, idx) => {
                                  const currentDish = dishes.find(d => d.id === item.dishId || d.name === item.name);
                                  const priceChanged = currentDish && currentDish.price !== item.price;
                                  const isUnavailable = !currentDish || !currentDish.isAvailable;

                                  return (
                                    <div key={idx} className="flex justify-between items-center py-2 text-sm" data-testid={`row-order-item-${order.id}-${idx}`}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium text-muted-foreground w-6 shrink-0">{item.quantity}x</span>
                                        <span className={isUnavailable ? "line-through text-muted-foreground" : ""}>
                                          {item.name}
                                        </span>
                                        {isUnavailable && (
                                          <Badge variant="destructive" className="text-xs h-5 px-1.5">Indisponible</Badge>
                                        )}
                                        {priceChanged && !isUnavailable && (
                                          <Badge variant="secondary" className="text-xs h-5 px-1.5">Prix modifié</Badge>
                                        )}
                                      </div>
                                      <span className="font-medium shrink-0 ml-2">{(item.price * item.quantity).toFixed(2)} €</span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                                <span>Total</span>
                                <span className="text-primary">{order.total?.toFixed(2)} €</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4">
                              <Button
                                size="sm"
                                onClick={() => handleReorder(order)}
                                data-testid={`button-reorder-${order.id}`}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Commander à nouveau
                              </Button>
                              {order.status === "delivered" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPreviewOrder(order)}
                                    data-testid={`button-preview-order-${order.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Aperçu
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/api/orders/${order.id}/invoice`, '_blank')}
                                    data-testid={`button-download-invoice-${order.id}`}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Facture
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finaliser la commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de commande</Label>
              <RadioGroup
                value={orderType}
                onValueChange={(v) => setOrderType(v as "delivery" | "takeaway")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery">Livraison</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="takeaway" id="takeaway" />
                  <Label htmlFor="takeaway">A emporter</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-name">Nom</Label>
              <Input
                id="checkout-name"
                value={deliveryForm.customerName}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, customerName: e.target.value })}
                data-testid="input-checkout-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-phone">Telephone</Label>
              <Input
                id="checkout-phone"
                value={deliveryForm.customerPhone}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, customerPhone: e.target.value })}
                data-testid="input-checkout-phone"
              />
            </div>

            {orderType === "delivery" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="checkout-address">Adresse</Label>
                  <Input
                    id="checkout-address"
                    value={deliveryForm.customerAddress}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, customerAddress: e.target.value })}
                    data-testid="input-checkout-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-zipcode">Code postal</Label>
                  <Input
                    id="checkout-zipcode"
                    value={deliveryForm.customerZipCode}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, customerZipCode: e.target.value })}
                    placeholder="ex: 13008"
                    data-testid="input-checkout-zipcode"
                  />
                  {restaurant.deliveryZipCodes && restaurant.deliveryZipCodes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Zones desservies: {restaurant.deliveryZipCodes.join(", ")}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between font-semibold mb-4">
                <span>Total</span>
                <span>{cart.getTotal().toFixed(2)} EUR</span>
              </div>
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={createOrderMutation.isPending}
                data-testid="button-confirm-order"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  "Confirmer la commande"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDish} onOpenChange={(open) => !open && setSelectedDish(null)}>
        <DialogContent className="max-w-lg">
          {selectedDish && (
            <>
              {selectedDish.imageUrl && (
                <div className="aspect-video relative overflow-hidden rounded-md -mt-2">
                  <img
                    src={selectedDish.imageUrl}
                    alt={selectedDish.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedDish.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedDish.description && (
                  <p className="text-muted-foreground">{selectedDish.description}</p>
                )}
                <p className="text-2xl font-bold text-primary">{selectedDish.price.toFixed(2)} EUR</p>
                <Button
                  className="w-full"
                  onClick={() => {
                    cart.addItem(selectedDish, restaurant!.id);
                    toast({ title: "Ajoute au panier" });
                    setSelectedDish(null);
                  }}
                  data-testid="button-add-dish-popup"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter au panier
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedDish(null)}
                  data-testid="button-close-dish-popup"
                >
                  <X className="h-4 w-4 mr-2" />
                  Fermer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewOrder} onOpenChange={(open) => !open && setPreviewOrder(null)}>
        <DialogContent className="max-w-md">
          {previewOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Commande #{previewOrder.id.slice(-6)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Date</span>
                  <span>{previewOrder.createdAt ? new Date(previewOrder.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : ""}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type</span>
                  <span>{previewOrder.orderType === "delivery" ? "Livraison" : "A emporter"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Statut</span>
                  {getStatusBadge(previewOrder.status, previewOrder.orderType)}
                </div>
                
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Articles</p>
                  <div className="space-y-2">
                    {((typeof previewOrder.items === 'string' ? JSON.parse(previewOrder.items) : previewOrder.items) as Array<{ name: string; quantity: number; price: number }>).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{(item.price * item.quantity).toFixed(2)} EUR</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{previewOrder.total?.toFixed(2)} EUR</span>
                </div>
                
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    window.open(`/api/orders/${previewOrder.id}/invoice`, '_blank');
                    setPreviewOrder(null);
                  }}
                  data-testid="button-preview-download-invoice"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Telecharger la facture
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mon compte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-firstName">Prenom</Label>
                <Input
                  id="account-firstName"
                  value={accountForm.firstName}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, firstName: e.target.value }))}
                  data-testid="input-account-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-lastName">Nom</Label>
                <Input
                  id="account-lastName"
                  value={accountForm.lastName}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, lastName: e.target.value }))}
                  data-testid="input-account-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-phone">Telephone</Label>
              <Input
                id="account-phone"
                type="tel"
                value={accountForm.phone}
                onChange={(e) => setAccountForm(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-account-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-address">Adresse</Label>
              <Input
                id="account-address"
                value={accountForm.address}
                onChange={(e) => setAccountForm(prev => ({ ...prev, address: e.target.value }))}
                data-testid="input-account-address"
              />
            </div>
            {pushNotifications.isSupported && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Notifications push</p>
                  <p className="text-xs text-muted-foreground">
                    Suivi de vos commandes en temps réel
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={pushNotifications.isSubscribed ? "outline" : "default"}
                  onClick={() => {
                    if (pushNotifications.isSubscribed) {
                      pushNotifications.unsubscribe().then((ok) => {
                        if (ok) toast({ title: "Notifications désactivées" });
                      });
                    } else {
                      pushNotifications.subscribe().then((ok) => {
                        if (ok) toast({ title: "Notifications activées !" });
                      });
                    }
                  }}
                  disabled={pushNotifications.isLoading}
                  data-testid="button-client-toggle-push"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  {pushNotifications.isSubscribed ? "Désactiver" : "Activer"}
                </Button>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAccountDialogOpen(false)}
                data-testid="button-account-cancel"
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={() => updateProfileMutation.mutate(accountForm)}
                disabled={updateProfileMutation.isPending}
                data-testid="button-account-save"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
