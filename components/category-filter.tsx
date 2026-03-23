import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Category } from "@shared/schema";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: CategoryFilterProps) {
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name ?? "Toutes les catégories"
    : "Toutes les catégories";

  return (
    <div className="sticky top-14 z-40 bg-background border-b">
      <div className="flex items-center gap-4 px-4 md:px-6 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="min-w-[200px] justify-between"
              data-testid="button-category-dropdown"
            >
              <span className="font-semibold uppercase tracking-wide text-sm">
                {selectedCategoryName}
              </span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuItem 
              onClick={() => onCategoryChange(null)}
              data-testid="menu-item-all-categories"
            >
              Toutes les catégories
            </DropdownMenuItem>
            {categories.map((category) => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                data-testid={`menu-item-category-${category.id}`}
              >
                {category.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un article"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
            data-testid="input-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
