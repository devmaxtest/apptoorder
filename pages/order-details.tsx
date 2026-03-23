import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  ArrowLeft, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  User,
  Clock,
  Truck,
  Package
} from "lucide-react";
import type { Order } from "@shared/schema";

interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function OrderDetails() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation("/client")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-bold text-lg">Order Details</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">This order doesn't exist or you don't have access to it.</p>
          <Button onClick={() => setLocation("/client")} data-testid="button-go-back">
            Go to My Orders
          </Button>
        </main>
      </div>
    );
  }

  const items: OrderItem[] = JSON.parse(order.items || "[]");
  const statusColor = 
    order.status === "completed" ? "default" :
    order.status === "pending" ? "secondary" :
    order.status === "cancelled" ? "destructive" : "outline";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/client")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-xs text-muted-foreground">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg">Order Status</CardTitle>
              <Badge variant={statusColor} className="text-sm">
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {order.orderType === "delivery" ? (
                <Truck className="w-4 h-4" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              <span>{order.orderType === "delivery" ? "Delivery" : "Pickup"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{order.customerPhone}</span>
            </div>
            {order.customerAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{order.customerAddress}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0"
                  data-testid={`item-${index}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.price.toFixed(2)}€ x {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {(item.price * item.quantity).toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold">{order.total.toFixed(2)}€</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Ordered on {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Unknown"}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
