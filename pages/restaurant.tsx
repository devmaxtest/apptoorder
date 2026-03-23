import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
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
  ChevronDown,
  Mail,
  CreditCard,
  Banknote
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import type { Restaurant, Category, Dish, RestaurantPhoto } from "@shared/schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      getTotal: () =>
        get().items.reduce(
          (total, item) => total + item.dish.price * item.quantity,
          0
        ),
      getItemCount: () =>
        get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    { name: "restaurant-cart" }
  )
);

interface AuthUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  address?: string;
}

export default function RestaurantPage() {
  const params = useParams<{ id: string }>();
  const restaurantId = params.id;
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [previewDish, setPreviewDish] = useState<Dish | null>(null);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPostalCode, setCustomerPostalCode] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDeliveryZoneError, setShowDeliveryZoneError] = useState(false);
  const [deliveryZoneErrorMessage, setDeliveryZoneErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [allowedZipCodes, setAllowedZipCodes] = useState<string[]>([]);

  const cart = useCart();

  const { data: user, isLoading: userLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
  });

  // Check if user is a valid customer
  const isCustomer = !userLoading && user?.role === "customer";

  // Close checkout and cart, show login prompt when auth resolves to non-customer
  useEffect(() => {
    if (!userLoading && !isCustomer) {
      // If checkout is open and user is not a customer, close it and show login prompt
      if (checkoutOpen) {
        setCheckoutOpen(false);
        setShowLoginPrompt(true);
      }
      // Clear cart for non-customers to prevent stale orders
      if (cart.items.length > 0) {
        cart.clearCart();
      }
    }
  }, [userLoading, isCustomer, checkoutOpen, cart]);

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}`);
      if (!res.ok) throw new Error("Restaurant not found");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/restaurants", restaurantId, "categories"],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/categories`);
      return res.json();
    },
    enabled: !!restaurantId,
  });

  const { data: dishes = [] } = useQuery<Dish[]>({
    queryKey: ["/api/restaurants", restaurantId, "dishes"],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/dishes`);
      return res.json();
    },
    enabled: !!restaurantId,
  });

  const { data: photos = [] } = useQuery<RestaurantPhoto[]>({
    queryKey: ["/api/restaurants", restaurantId, "photos"],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/photos`);
      return res.json();
    },
    enabled: !!restaurantId,
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      // Final customer role check before submitting
      if (!isCustomer) {
        throw new Error("Vous devez être connecté en tant que client pour commander");
      }
      const orderData = {
        restaurantId,
        items: cart.items.map((item) => ({
          dishId: item.dish.id,
          quantity: item.quantity,
        })),
        customerName,
        customerPhone,
        customerAddress: orderType === "delivery" ? customerAddress : null,
        customerPostalCode: orderType === "delivery" ? customerPostalCode : null,
        orderType,
      };
      
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle delivery zone errors specifically
        if (errorData.error === "DELIVERY_ZONE_NOT_AVAILABLE" || errorData.error === "DELIVERY_ZONE_REQUIRED") {
          setDeliveryZoneErrorMessage(errorData.message || "Zone de livraison non disponible");
          setAllowedZipCodes(errorData.allowedZipCodes || []);
          setShowDeliveryZoneError(true);
          throw new Error("DELIVERY_ZONE_ERROR");
        }
        
        throw new Error(errorData.error || errorData.message || "Une erreur est survenue");
      }
      
      return response.json();
    },
    onSuccess: async (order: any) => {
      if (paymentMethod === "card" && restaurant?.stripeConnected && order?.id) {
        try {
          const payRes = await fetch(`/api/orders/${order.id}/pay`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const payData = await payRes.json();
          if (payData.url) {
            cart.clearCart();
            setCheckoutOpen(false);
            window.location.href = payData.url;
            return;
          }
        } catch {}
      }
      cart.clearCart();
      setCheckoutOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerPostalCode("");
      toast({ title: "Commande passee avec succes !" });
    },
    onError: (error: any) => {
      // Don't show toast for delivery zone errors (already handled with dialog)
      if (error.message === "DELIVERY_ZONE_ERROR") return;
      
      toast({
        title: "Echec de la commande",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = (dish: Dish) => {
    if (!restaurantId) return;
    // Only customers can add items to cart
    if (!isCustomer) {
      setShowLoginPrompt(true);
      return;
    }
    cart.addItem(dish, restaurantId);
    toast({ title: "Ajoute au panier", description: dish.name });
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = !selectedCategory || dish.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && dish.isAvailable;
  });

  const groupedDishes = categories
    .map((category) => ({
      category,
      dishes: filteredDishes.filter((dish) => dish.categoryId === category.id),
    }))
    .filter((group) => group.dishes.length > 0);

  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Restaurant introuvable</h1>
      </div>
    );
  }

  const cartItemCount = cart.getItemCount();
  const isCurrentRestaurant = cart.restaurantId === restaurantId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-card">
        <div className="container mx-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt={restaurant.name} className="h-6 w-6 sm:h-7 sm:w-7 rounded-full object-cover" />
            ) : (
              <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            )}
            <h1 className="font-bold text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{restaurant.name}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-8 w-8" data-testid="button-cart">
                  <ShoppingCart className="h-4 w-4" />
                  {cartItemCount > 0 && isCurrentRestaurant && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center p-0 text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Votre panier</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {!isCurrentRestaurant || cart.items.length === 0 ? (
                    <p className="text-muted-foreground">Votre panier est vide</p>
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
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              data-testid={`button-decrease-${item.dish.id}`}
                              onClick={() => cart.updateQuantity(item.dish.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              data-testid={`button-increase-${item.dish.id}`}
                              onClick={() => cart.updateQuantity(item.dish.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              data-testid={`button-remove-${item.dish.id}`}
                              onClick={() => cart.removeItem(item.dish.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{cart.getTotal().toFixed(2)} EUR</span>
                        </div>
                        {restaurant.deliveryMinOrder && cart.getTotal() < restaurant.deliveryMinOrder && (
                          <p className="text-sm text-destructive mt-2">
                            Commande minimum : {restaurant.deliveryMinOrder.toFixed(2)} EUR
                          </p>
                        )}
                        <Button
                          className="w-full mt-4"
                          data-testid="button-checkout"
                          disabled={restaurant.deliveryMinOrder ? cart.getTotal() < restaurant.deliveryMinOrder : false}
                          onClick={() => {
                            if (!isCustomer) {
                              setCartOpen(false);
                              setShowLoginPrompt(true);
                              return;
                            }
                            setCartOpen(false);
                            setCheckoutOpen(true);
                          }}
                        >
                          Commander
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {(restaurant.showHeroSection ?? true) && (
        <div 
          className="relative border-b overflow-hidden"
          style={{
            minHeight: restaurant.heroImageUrl ? '280px' : '120px',
          }}
        >
          {restaurant.heroImageUrl ? (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${restaurant.heroImageUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="container mx-auto px-4 py-8 sm:py-12 relative h-full flex flex-col justify-center items-center text-center">
            {restaurant.logoUrl && (
              <img 
                src={restaurant.logoUrl} 
                alt={restaurant.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow-lg mb-4"
              />
            )}
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2">
              {restaurant.heroTitle || restaurant.name}
            </h2>
            {restaurant.heroSubtitle && (
              <p className="text-white/90 text-sm sm:text-lg mb-4 max-w-xl">
                {restaurant.heroSubtitle}
              </p>
            )}
            <div className="flex items-center gap-3 text-white/80 text-sm mb-4">
              <Badge variant={restaurant.isOpen ? "default" : "secondary"} className="text-xs">
                {restaurant.isOpen ? "Ouvert" : "Ferme"}
              </Badge>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{restaurant.openTime} - {restaurant.closeTime}</span>
              </div>
            </div>
            <Button 
              onClick={() => document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-hero-cta"
            >
              {restaurant.heroCTAText || "Commander maintenant"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Compact Header (when Hero is hidden) */}
      {!(restaurant.showHeroSection ?? true) && (
        <div className="relative border-b overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 relative">
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              {restaurant.logoUrl ? (
                <img 
                  src={restaurant.logoUrl} 
                  alt={restaurant.name} 
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-background shadow-md"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-primary/10 flex items-center justify-center border border-background shadow-md">
                  <Store className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-base sm:text-lg font-bold truncate">{restaurant.name}</h2>
                  <Badge variant={restaurant.isOpen ? "default" : "secondary"} className="text-xs">
                    {restaurant.isOpen ? "Ouvert" : "Ferme"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                  {restaurant.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{restaurant.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{restaurant.openTime} - {restaurant.closeTime}</span>
                  </div>
                  {restaurant.phone && (
                    <div className="hidden sm:flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{restaurant.phone}</span>
                    </div>
                  )}
                </div>
                {restaurant.deliveryMinOrder && restaurant.deliveryMinOrder > 0 && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    Min. livraison : <span className="font-semibold text-foreground">{restaurant.deliveryMinOrder.toFixed(2)} EUR</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      {(restaurant.showAboutSection ?? true) && restaurant.aboutText && (
        <div className="container mx-auto px-4 py-6 border-b" id="about-section">
          <h3 className="text-lg font-semibold mb-4">À propos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-muted-foreground whitespace-pre-line">{restaurant.aboutText}</p>
              {/* Social Links */}
              {(restaurant.facebookUrl || restaurant.instagramUrl || restaurant.twitterUrl) && (
                <div className="flex items-center gap-3 mt-4">
                  {restaurant.facebookUrl && (
                    <a href={restaurant.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <SiFacebook className="h-5 w-5" />
                    </a>
                  )}
                  {restaurant.instagramUrl && (
                    <a href={restaurant.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <SiInstagram className="h-5 w-5" />
                    </a>
                  )}
                  {restaurant.twitterUrl && (
                    <a href={restaurant.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <SiX className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
            {restaurant.aboutImageUrl && (
              <div className="hidden md:block">
                <img 
                  src={restaurant.aboutImageUrl} 
                  alt="À propos" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery Section */}
      {(restaurant.showGallerySection ?? true) && photos.length > 0 && (
        <div className="container mx-auto px-2 sm:px-4 py-3 border-b" id="gallery-section">
          <h3 className="text-sm font-medium mb-2">Galerie</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className="relative flex-shrink-0"
                data-testid={`restaurant-photo-${photo.id}`}
              >
                <img 
                  src={photo.imageUrl} 
                  alt={photo.caption || "Photo du restaurant"} 
                  className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-md border"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Section */}
      {(restaurant.showMenuSection ?? true) && (
      <div id="menu-section">
      <div className="container mx-auto px-2 sm:px-4 py-2 sticky top-[44px] sm:top-[48px] z-40 bg-background border-b">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={selectedCategory === null ? "default" : "outline"}
              data-testid="button-category-all"
              onClick={() => setSelectedCategory(null)}
              className="h-7 text-xs px-2"
            >
              Tout
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                data-testid={`button-category-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className="h-7 text-xs px-2"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-2 sm:px-4 py-3">
        {groupedDishes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">Aucun plat disponible</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedDishes.map(({ category, dishes: categoryDishes }) => (
              <section key={category.id}>
                <h2 className="text-sm sm:text-base font-semibold mb-2">{category.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {categoryDishes.map((dish) => (
                    <Card 
                      key={dish.id} 
                      className="overflow-hidden hover-elevate"
                      data-testid={`card-dish-${dish.id}`}
                    >
                      <div 
                        className="aspect-square bg-muted relative cursor-pointer"
                        onClick={() => setPreviewDish(dish)}
                      >
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Store className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                          </div>
                        )}
                        <Button
                          size="icon"
                          className="absolute bottom-1 right-1 h-7 w-7"
                          data-testid={`button-add-${dish.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(dish);
                          }}
                          disabled={!restaurant.isOpen}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <CardContent className="p-2">
                        <h3 className="font-medium text-xs sm:text-sm line-clamp-1">{dish.name}</h3>
                        <p className="font-semibold text-primary text-xs sm:text-sm mt-0.5">{dish.price.toFixed(2)} EUR</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      </div>
      )}
      {/* End of Menu Section */}

      {/* Contact Section */}
      {(restaurant.showContactSection ?? true) && (restaurant.address || restaurant.phone) && (
        <div className="container mx-auto px-4 py-6 border-t" id="contact-section">
          <h3 className="text-lg font-semibold mb-4">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurant.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Adresse</p>
                  <p className="text-muted-foreground">{restaurant.address}</p>
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Telephone</p>
                  <a href={`tel:${restaurant.phone}`} className="text-muted-foreground hover:text-primary">
                    {restaurant.phone}
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Horaires</p>
                <p className="text-muted-foreground">{restaurant.openTime} - {restaurant.closeTime}</p>
              </div>
            </div>
            {restaurant.deliveryMinOrder && restaurant.deliveryMinOrder > 0 && (
              <div className="flex items-start gap-3">
                <ShoppingCart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Commande minimum</p>
                  <p className="text-muted-foreground">{restaurant.deliveryMinOrder.toFixed(2)} EUR</p>
                </div>
              </div>
            )}
          </div>
          {/* Social Links in Contact */}
          {(restaurant.facebookUrl || restaurant.instagramUrl || restaurant.twitterUrl) && (
            <div className="flex items-center gap-4 mt-6 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Suivez-nous :</span>
              {restaurant.facebookUrl && (
                <a href={restaurant.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <SiFacebook className="h-5 w-5" />
                </a>
              )}
              {restaurant.instagramUrl && (
                <a href={restaurant.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <SiInstagram className="h-5 w-5" />
                </a>
              )}
              {restaurant.twitterUrl && (
                <a href={restaurant.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <SiX className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Finaliser votre commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as "delivery" | "pickup")} className="flex gap-4">
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="delivery" id="delivery" data-testid="radio-delivery" />
                <Label htmlFor="delivery" className="text-sm">Livraison</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="pickup" id="pickup" data-testid="radio-pickup" />
                <Label htmlFor="pickup" className="text-sm">A emporter</Label>
              </div>
            </RadioGroup>

            <div className="space-y-1">
              <Label htmlFor="name" className="text-sm">Nom</Label>
              <Input
                id="name"
                data-testid="input-customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Votre nom"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm">Telephone</Label>
              <Input
                id="phone"
                data-testid="input-customer-phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Numero de telephone"
                className="h-8 text-sm"
              />
            </div>

            {orderType === "delivery" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-sm">Adresse de livraison</Label>
                  <Input
                    id="address"
                    data-testid="input-customer-address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Votre adresse"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postalCode" className="text-sm">Code postal</Label>
                  <Input
                    id="postalCode"
                    data-testid="input-customer-postal-code"
                    value={customerPostalCode}
                    onChange={(e) => setCustomerPostalCode(e.target.value)}
                    placeholder="Ex: 13001"
                    className="h-8 text-sm"
                    maxLength={10}
                  />
                  {restaurant?.deliveryZipCodes && restaurant.deliveryZipCodes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Zones de livraison: {restaurant.deliveryZipCodes.join(", ")}
                    </p>
                  )}
                </div>
              </>
            )}

            {restaurant?.stripeConnected && (
              <div className="space-y-1">
                <Label className="text-sm">Paiement</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("card")}
                    data-testid="button-pay-card"
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Carte
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    data-testid="button-pay-cash"
                  >
                    <Banknote className="h-3 w-3 mr-1" />
                    Espèces
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex justify-between font-semibold mb-3 text-sm">
                <span>Total</span>
                <span>{cart.getTotal().toFixed(2)} EUR</span>
              </div>
              <Button
                className="w-full"
                size="sm"
                data-testid="button-place-order"
                disabled={
                  orderMutation.isPending ||
                  !customerName ||
                  !customerPhone ||
                  (orderType === "delivery" && !customerAddress) ||
                  (orderType === "delivery" && !!restaurant?.deliveryZipCodes?.length && !customerPostalCode)
                }
                onClick={() => orderMutation.mutate()}
              >
                {orderMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                {paymentMethod === "card" && restaurant?.stripeConnected ? (
                  <>
                    <CreditCard className="h-3 w-3 mr-1" />
                    Payer {cart.getTotal().toFixed(2)}€ par carte
                  </>
                ) : (
                  "Passer la commande"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDish} onOpenChange={(open) => !open && setPreviewDish(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {previewDish && (
            <>
              <div className="relative">
                {previewDish.imageUrl ? (
                  <img
                    src={previewDish.imageUrl}
                    alt={previewDish.name}
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                    <Store className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <DialogHeader>
                  <DialogTitle className="text-base">{previewDish.name}</DialogTitle>
                </DialogHeader>
                {previewDish.description && (
                  <p className="text-muted-foreground text-sm">{previewDish.description}</p>
                )}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-lg font-bold text-primary">{previewDish.price.toFixed(2)} EUR</p>
                  <Button
                    size="sm"
                    data-testid="button-add-from-preview"
                    onClick={() => {
                      handleAddToCart(previewDish);
                      setPreviewDish(null);
                    }}
                    disabled={!restaurant.isOpen}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Connexion requise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Pour passer une commande, vous devez vous connecter avec un compte client.
            </p>
            <Button 
              className="w-full"
              onClick={() => window.location.href = "/client"}
              data-testid="button-login-redirect"
            >
              Se connecter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeliveryZoneError} onOpenChange={setShowDeliveryZoneError}>
        <AlertDialogContent data-testid="alert-delivery-zone-error">
          <AlertDialogHeader>
            <AlertDialogTitle>Zone de livraison non disponible</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{deliveryZoneErrorMessage}</p>
              {allowedZipCodes.length > 0 && (
                <div>
                  <p className="font-medium text-foreground">Codes postaux de livraison disponibles:</p>
                  <p className="mt-1">{allowedZipCodes.join(", ")}</p>
                </div>
              )}
              <p>Veuillez modifier votre code postal ou choisir l'option "À emporter".</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-close-delivery-zone-error">
              Compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
