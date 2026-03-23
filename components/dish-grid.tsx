import { UtensilsCrossed } from "lucide-react";
import { DishCard } from "@/components/dish-card";
import type { Dish, Category } from "@shared/schema";

interface DishGridProps {
  dishes: Dish[];
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  onAddToCart: (dish: Dish) => void;
}

export function DishGrid({ 
  dishes, 
  categories,
  selectedCategory, 
  searchQuery, 
  onAddToCart 
}: DishGridProps) {
  // Filter dishes by category and search query
  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = !selectedCategory || dish.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group dishes by category
  const dishesByCategory = categories
    .map((category) => ({
      category,
      dishes: filteredDishes.filter((dish) => dish.categoryId === category.id),
    }))
    .filter((group) => group.dishes.length > 0);

  if (filteredDishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="empty-dishes-state">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Aucun plat trouvé
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          Essayez de modifier votre recherche ou de sélectionner une autre catégorie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      {dishesByCategory.map(({ category, dishes: categoryDishes }) => (
        <section key={category.id}>
          <h2 
            className="text-xl font-bold text-foreground uppercase tracking-wide mb-4 px-4 md:px-6"
            data-testid={`text-category-title-${category.id}`}
          >
            {category.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-6">
            {categoryDishes.map((dish) => (
              <DishCard 
                key={dish.id} 
                dish={dish} 
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
