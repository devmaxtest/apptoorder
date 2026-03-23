import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Dish } from "@shared/schema";

interface DishCardProps {
  dish: Dish;
  onAddToCart: (dish: Dish) => void;
}

export function DishCard({ dish, onAddToCart }: DishCardProps) {
  return (
    <Card 
      className="group overflow-visible border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
      data-testid={`card-dish-${dish.id}`}
    >
      <div className="flex gap-4 p-4">
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-foreground truncate"
            data-testid={`text-dish-name-${dish.id}`}
          >
            {dish.name}
          </h3>
          {dish.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {dish.description}
            </p>
          )}
          <p 
            className="text-lg font-bold text-primary mt-3"
            data-testid={`text-dish-price-${dish.id}`}
          >
            {dish.price.toFixed(2)} €
          </p>
        </div>
        
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-md overflow-hidden bg-muted">
            {dish.imageUrl ? (
              <img
                src={dish.imageUrl}
                alt={dish.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                data-testid={`img-dish-${dish.id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <Button
            size="icon"
            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md"
            onClick={() => onAddToCart(dish)}
            disabled={!dish.isAvailable}
            data-testid={`button-add-dish-${dish.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
