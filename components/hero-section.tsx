import { MapPin, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RestaurantInfo } from "@shared/schema";

interface HeroSectionProps {
  restaurant: RestaurantInfo;
}

export function HeroSection({ restaurant }: HeroSectionProps) {
  return (
    <div className="relative h-64 lg:h-80 w-full overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&h=600&fit=crop')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
      
      <div className="relative h-full flex items-center px-4 md:px-6">
        <Card className="bg-white/95 dark:bg-card/95 backdrop-blur-md p-6 max-w-md shadow-lg">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-restaurant-name">
            {restaurant.name}
          </h1>
          
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span data-testid="text-restaurant-address">{restaurant.address}</span>
          </div>
          
          <Badge 
            variant={restaurant.isOpen ? "default" : "secondary"}
            className={restaurant.isOpen ? "bg-green-500 hover:bg-green-600" : ""}
            data-testid="badge-open-status"
          >
            {restaurant.isOpen ? "Ouvert" : "Fermé"}
          </Badge>
          
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Prochain créneau : <strong className="text-foreground">{restaurant.openTime}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>Livraison jusqu'à : <strong className="text-foreground">{restaurant.closeTime}</strong></span>
            </div>
          </div>
          
          <Button 
            variant="ghost"
            className="mt-4 px-0 text-primary"
            data-testid="button-view-hours"
          >
            Voir les horaires
          </Button>
        </Card>
      </div>
      
      <div className="absolute right-4 top-4 md:right-6">
        <Card className="bg-primary text-primary-foreground p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-5 w-5" />
            <span className="font-semibold">LIVRAISON</span>
          </div>
          <p className="text-sm opacity-90" data-testid="text-min-order">
            (Minimum de commande : {restaurant.deliveryMinOrder}€)
          </p>
        </Card>
      </div>
    </div>
  );
}
