import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartStore } from "@/lib/cart-store";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

export function CartSheet({ open, onOpenChange, onCheckout }: CartSheetProps) {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const total = getTotal();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Votre panier
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Votre panier est vide
            </h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez des plats délicieux à votre commande
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto py-4 space-y-4">
              {items.map((item) => (
                <div 
                  key={item.dishId} 
                  className="flex gap-3"
                  data-testid={`cart-item-${item.dishId}`}
                >
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.dish?.imageUrl ? (
                      <img
                        src={item.dish.imageUrl}
                        alt={item.dish?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">
                      {item.dish?.name}
                    </h4>
                    <p className="text-sm text-primary font-semibold">
                      {((item.dish?.price ?? 0) * item.quantity).toFixed(2)} €
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.dishId, item.quantity - 1)}
                        data-testid={`button-decrease-${item.dishId}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span 
                        className="w-8 text-center text-sm font-medium"
                        data-testid={`text-quantity-${item.dishId}`}
                      >
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.dishId, item.quantity + 1)}
                        data-testid={`button-increase-${item.dishId}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-destructive"
                        onClick={() => removeItem(item.dishId)}
                        data-testid={`button-remove-${item.dishId}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-semibold" data-testid="text-cart-subtotal">
                  {total.toFixed(2)} €
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary" data-testid="text-cart-total">
                  {total.toFixed(2)} €
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearCart}
                  data-testid="button-clear-cart"
                >
                  Vider
                </Button>
                <Button 
                  className="flex-1"
                  onClick={onCheckout}
                  data-testid="button-checkout"
                >
                  Commander
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
