import { Home, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCartStore } from "@/lib/cart-store";

interface HeaderProps {
  onCartClick: () => void;
  restaurantName?: string;
}

export function Header({ onCartClick, restaurantName = "SUGU" }: HeaderProps) {
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <a 
            href="/" 
            className="flex items-center gap-2"
            data-testid="link-home"
          >
            <div className="flex h-8 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm tracking-wider">
              {restaurantName}
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" data-testid="button-nav-home">
              <Home className="mr-2 h-4 w-4" />
              ACCUEIL
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onCartClick}
            data-testid="button-cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                variant="destructive"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
          <Button variant="default" size="sm" data-testid="button-login">
            <User className="mr-2 h-4 w-4" />
            SE CONNECTER
          </Button>
        </div>
      </div>
    </header>
  );
}
