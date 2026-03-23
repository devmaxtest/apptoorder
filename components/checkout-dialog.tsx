import { useState } from "react";
import { Loader2, MapPin, Phone, User, Truck, Store, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stripeConnected?: boolean;
}

export function CheckoutDialog({ open, onOpenChange, stripeConnected }: CheckoutDialogProps) {
  const { items, getTotal, clearCart } = useCartStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">(stripeConnected ? "card" : "cash");
  
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerEmail: "",
  });

  const total = getTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "delivery" && !formData.customerAddress) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre adresse de livraison",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems = items.map((item) => ({
        dishId: item.dishId,
        quantity: item.quantity,
      }));

      const orderRes = await apiRequest("POST", "/api/orders", {
        items: orderItems,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: orderType === "delivery" ? formData.customerAddress : undefined,
        orderType,
      });

      const order = await orderRes.json();

      if (paymentMethod === "card" && stripeConnected && order.id) {
        try {
          const payRes = await fetch(`/api/orders/${order.id}/pay`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.customerEmail }),
          });
          const payData = await payRes.json();
          if (payData.url) {
            clearCart();
            onOpenChange(false);
            setFormData({ customerName: "", customerPhone: "", customerAddress: "", customerEmail: "" });
            window.location.href = payData.url;
            return;
          }
        } catch {
          toast({
            title: "Paiement en ligne indisponible",
            description: "Votre commande a été enregistrée. Paiement à la livraison/retrait.",
          });
        }
      }

      toast({
        title: "Commande confirmée !",
        description: paymentMethod === "cash"
          ? "Paiement à la livraison/retrait"
          : "Votre commande a été envoyée avec succès",
      });

      clearCart();
      onOpenChange(false);
      setFormData({ customerName: "", customerPhone: "", customerAddress: "", customerEmail: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Finaliser la commande</DialogTitle>
          <DialogDescription>
            Entrez vos informations pour confirmer votre commande
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "delivery" | "pickup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="delivery" data-testid="tab-delivery">
                <Truck className="h-4 w-4 mr-2" />
                Livraison
              </TabsTrigger>
              <TabsTrigger value="pickup" data-testid="tab-pickup">
                <Store className="h-4 w-4 mr-2" />
                À emporter
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nom complet *
              </Label>
              <Input
                id="name"
                placeholder="Votre nom"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                data-testid="input-customer-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="06 12 34 56 78"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                data-testid="input-customer-phone"
              />
            </div>

            {orderType === "delivery" && (
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse de livraison *
                </Label>
                <Textarea
                  id="address"
                  placeholder="Votre adresse complète"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  rows={3}
                  data-testid="input-customer-address"
                />
              </div>
            )}

            {stripeConnected && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Mode de paiement</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setPaymentMethod("card")}
                    data-testid="button-pay-card"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Carte bancaire
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setPaymentMethod("cash")}
                    data-testid="button-pay-cash"
                  >
                    <Banknote className="h-4 w-4 mr-2" />
                    Espèces
                  </Button>
                </div>
              </div>
            )}

            {paymentMethod === "card" && stripeConnected && (
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  Email (pour le reçu)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  data-testid="input-customer-email"
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between gap-4 text-sm text-muted-foreground flex-wrap">
              <span data-testid="text-item-count">{items.length} article(s)</span>
              <span data-testid="text-subtotal">{total.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between gap-4 text-lg font-bold flex-wrap">
              <span>Total</span>
              <span className="text-primary" data-testid="text-checkout-total">
                {total.toFixed(2)} €
              </span>
            </div>
            {paymentMethod === "card" && stripeConnected && (
              <Badge variant="secondary" className="w-full justify-center py-1">
                <CreditCard className="h-3 w-3 mr-1" />
                Paiement sécurisé par Stripe
              </Badge>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || items.length === 0}
            data-testid="button-confirm-order"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : paymentMethod === "card" && stripeConnected ? (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Payer {total.toFixed(2)} € par carte
              </>
            ) : (
              "Confirmer la commande"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
