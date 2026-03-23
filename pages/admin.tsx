import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  UtensilsCrossed, 
  ListOrdered, 
  Plus, 
  Pencil, 
  Trash2, 
  LogOut,
  Loader2,
  Clock,
  Package,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Restaurant, Category, Dish, Order } from "@shared/schema";

function RestaurantSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    logoUrl: "",
    openTime: "09:00",
    closeTime: "22:00",
    deliveryMinOrder: 10,
    isOpen: true,
  });

  const { data: restaurant, isLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/my-restaurant"],
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        logoUrl: restaurant.logoUrl || "",
        openTime: restaurant.openTime || "09:00",
        closeTime: restaurant.closeTime || "22:00",
        deliveryMinOrder: restaurant.deliveryMinOrder || 10,
        isOpen: restaurant.isOpen ?? true,
      });
    }
  }, [restaurant]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/my-restaurant", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
      toast({ title: "Restaurant created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create restaurant", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", "/api/my-restaurant", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
      toast({ title: "Restaurant updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update restaurant", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Restaurant Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              data-testid="input-restaurant-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your Restaurant Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              data-testid="input-restaurant-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            data-testid="input-restaurant-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Full address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            data-testid="input-restaurant-logo"
            value={formData.logoUrl}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="openTime">Open Time</Label>
            <Input
              id="openTime"
              data-testid="input-open-time"
              type="time"
              value={formData.openTime}
              onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closeTime">Close Time</Label>
            <Input
              id="closeTime"
              data-testid="input-close-time"
              type="time"
              value={formData.closeTime}
              onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minOrder">Min Order Amount</Label>
            <Input
              id="minOrder"
              data-testid="input-min-order"
              type="number"
              value={formData.deliveryMinOrder}
              onChange={(e) => setFormData({ ...formData, deliveryMinOrder: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="isOpen"
            data-testid="switch-is-open"
            checked={formData.isOpen}
            onCheckedChange={(checked) => setFormData({ ...formData, isOpen: checked })}
          />
          <Label htmlFor="isOpen">Restaurant is Open</Label>
        </div>
        <Button
          data-testid="button-save-restaurant"
          onClick={() => (restaurant ? updateMutation.mutate() : createMutation.mutate())}
          disabled={createMutation.isPending || updateMutation.isPending || !formData.name}
        >
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {restaurant ? "Save Changes" : "Create Restaurant"}
        </Button>
      </CardContent>
    </Card>
  );
}

function MenuManagement() {
  const { toast } = useToast();
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [dishDialog, setDishDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", nameEn: "" });
  const [dishForm, setDishForm] = useState({
    name: "",
    description: "",
    price: 0,
    imageUrl: "",
    categoryId: "",
    isAvailable: true,
  });

  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/my-restaurant"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "categories"],
    queryFn: async () => {
      if (!restaurant) return [];
      const res = await fetch(`/api/restaurants/${restaurant.id}/categories`);
      return res.json();
    },
    enabled: !!restaurant,
  });

  const { data: dishes = [] } = useQuery<Dish[]>({
    queryKey: ["/api/restaurants", restaurant?.id, "dishes"],
    queryFn: async () => {
      if (!restaurant) return [];
      const res = await fetch(`/api/restaurants/${restaurant.id}/dishes`);
      return res.json();
    },
    enabled: !!restaurant,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/my-restaurant/categories", categoryForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "categories"] });
      setCategoryDialog(false);
      setCategoryForm({ name: "", nameEn: "" });
      toast({ title: "Category created" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategory) return;
      return await apiRequest("PATCH", `/api/categories/${editingCategory.id}`, categoryForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "categories"] });
      setCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", nameEn: "" });
      toast({ title: "Category updated" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "categories"] });
      toast({ title: "Category deleted" });
    },
  });

  const createDishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/my-restaurant/dishes", dishForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "dishes"] });
      setDishDialog(false);
      setDishForm({ name: "", description: "", price: 0, imageUrl: "", categoryId: "", isAvailable: true });
      toast({ title: "Dish created" });
    },
  });

  const updateDishMutation = useMutation({
    mutationFn: async () => {
      if (!editingDish) return;
      return await apiRequest("PATCH", `/api/dishes/${editingDish.id}`, dishForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "dishes"] });
      setDishDialog(false);
      setEditingDish(null);
      setDishForm({ name: "", description: "", price: 0, imageUrl: "", categoryId: "", isAvailable: true });
      toast({ title: "Dish updated" });
    },
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/dishes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurant?.id, "dishes"] });
      toast({ title: "Dish deleted" });
    },
  });

  if (!restaurant) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please create your restaurant first in the Settings tab.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle>Categories</CardTitle>
          <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="button-add-category"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: "", nameEn: "" });
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    data-testid="input-category-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (English)</Label>
                  <Input
                    data-testid="input-category-name-en"
                    value={categoryForm.nameEn}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                    placeholder="English name"
                  />
                </div>
                <Button
                  data-testid="button-save-category"
                  onClick={() => (editingCategory ? updateCategoryMutation.mutate() : createCategoryMutation.mutate())}
                  disabled={!categoryForm.name || !categoryForm.nameEn}
                >
                  {editingCategory ? "Save" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 bg-muted rounded-md px-3 py-1">
                <span>{cat.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  data-testid={`button-edit-category-${cat.id}`}
                  onClick={() => {
                    setEditingCategory(cat);
                    setCategoryForm({ name: cat.name, nameEn: cat.nameEn });
                    setCategoryDialog(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  data-testid={`button-delete-category-${cat.id}`}
                  onClick={() => deleteCategoryMutation.mutate(cat.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-muted-foreground">No categories yet</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle>Dishes</CardTitle>
          <Dialog open={dishDialog} onOpenChange={setDishDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                data-testid="button-add-dish"
                onClick={() => {
                  setEditingDish(null);
                  setDishForm({ name: "", description: "", price: 0, imageUrl: "", categoryId: categories[0]?.id || "", isAvailable: true });
                }}
                disabled={categories.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Dish
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDish ? "Edit Dish" : "Add Dish"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    data-testid="input-dish-name"
                    value={dishForm.name}
                    onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                    placeholder="Dish name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    data-testid="input-dish-description"
                    value={dishForm.description}
                    onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                    placeholder="Describe the dish"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    data-testid="input-dish-price"
                    type="number"
                    step="0.01"
                    value={dishForm.price}
                    onChange={(e) => setDishForm({ ...dishForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    data-testid="input-dish-image"
                    value={dishForm.imageUrl}
                    onChange={(e) => setDishForm({ ...dishForm, imageUrl: e.target.value })}
                    placeholder="https://example.com/dish.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    data-testid="select-dish-category"
                    className="w-full p-2 border rounded-md bg-background"
                    value={dishForm.categoryId}
                    onChange={(e) => setDishForm({ ...dishForm, categoryId: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    data-testid="switch-dish-available"
                    checked={dishForm.isAvailable}
                    onCheckedChange={(checked) => setDishForm({ ...dishForm, isAvailable: checked })}
                  />
                  <Label>Available</Label>
                </div>
                <Button
                  data-testid="button-save-dish"
                  onClick={() => (editingDish ? updateDishMutation.mutate() : createDishMutation.mutate())}
                  disabled={!dishForm.name || !dishForm.categoryId || dishForm.price <= 0}
                >
                  {editingDish ? "Save" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((dish) => (
              <Card key={dish.id} className="overflow-hidden">
                {dish.imageUrl && (
                  <img src={dish.imageUrl} alt={dish.name} className="h-32 w-full object-cover" />
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-medium">{dish.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{dish.description}</p>
                      <p className="font-semibold mt-1">{dish.price.toFixed(2)} EUR</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-edit-dish-${dish.id}`}
                        onClick={() => {
                          setEditingDish(dish);
                          setDishForm({
                            name: dish.name,
                            description: dish.description || "",
                            price: dish.price,
                            imageUrl: dish.imageUrl || "",
                            categoryId: dish.categoryId,
                            isAvailable: dish.isAvailable,
                          });
                          setDishDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-dish-${dish.id}`}
                        onClick={() => deleteDishMutation.mutate(dish.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!dish.isAvailable && <Badge variant="secondary">Unavailable</Badge>}
                </CardContent>
              </Card>
            ))}
            {dishes.length === 0 && <p className="text-muted-foreground col-span-full">No dishes yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersManagement() {
  const { toast } = useToast();
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/my-restaurant"],
  });

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/my-restaurant/orders"],
    enabled: !!restaurant,
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant/orders"] });
      toast({ title: "Order status updated" });
    },
  });

  if (!restaurant) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please create your restaurant first in the Settings tab.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "preparing": return <Package className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "pending": return "secondary";
      case "preparing": return "default";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => {
          const items = JSON.parse(order.items);
          return (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{order.customerName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                </div>
                <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                  {getStatusIcon(order.status)}
                  {order.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Order Type: {order.orderType}</p>
                  {order.customerAddress && <p className="text-sm text-muted-foreground">{order.customerAddress}</p>}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Items:</p>
                  <ul className="space-y-1">
                    {items.map((item: any, idx: number) => (
                      <li key={idx} className="text-sm flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{(item.price * item.quantity).toFixed(2)} EUR</span>
                      </li>
                    ))}
                  </ul>
                  <p className="font-semibold mt-2">Total: {order.total.toFixed(2)} EUR</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        data-testid={`button-accept-order-${order.id}`}
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: "preparing" })}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid={`button-cancel-order-${order.id}`}
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: "cancelled" })}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {order.status === "preparing" && (
                    <Button
                      size="sm"
                      data-testid={`button-complete-order-${order.id}`}
                      onClick={() => updateStatusMutation.mutate({ id: order.id, status: "completed" })}
                    >
                      Mark Completed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading, logout, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <Store className="h-16 w-16 text-primary" />
        <h1 className="text-2xl font-bold">Restaurant Admin</h1>
        <p className="text-muted-foreground">Sign in to manage your restaurant</p>
        <Button data-testid="button-login" onClick={() => window.location.href = "/api/login"}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-lg">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email || user?.firstName}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" data-testid="button-logout" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="settings">
          <TabsList className="mb-6">
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Store className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="menu" data-testid="tab-menu">
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ListOrdered className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <RestaurantSettings />
          </TabsContent>

          <TabsContent value="menu">
            <MenuManagement />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
