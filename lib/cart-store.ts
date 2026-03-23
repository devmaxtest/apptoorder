import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Dish } from "@shared/schema";

interface CartItem {
  dishId: string;
  quantity: number;
}

interface CartStore {
  items: (CartItem & { dish?: Dish })[];
  addItem: (dish: Dish, quantity?: number) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (dish: Dish, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.dishId === dish.id);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.dishId === dish.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return {
            items: [...state.items, { dishId: dish.id, quantity, dish }],
          };
        });
      },
      
      removeItem: (dishId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.dishId !== dishId),
        }));
      },
      
      updateQuantity: (dishId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(dishId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.dishId === dishId ? { ...item, quantity } : item
          ),
        }));
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.dish?.price ?? 0;
          return total + price * item.quantity;
        }, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "restaurant-cart",
    }
  )
);
