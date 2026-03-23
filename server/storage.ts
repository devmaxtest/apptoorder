import { 
  type Dish, type InsertDish, dishes,
  type Category, type InsertCategory, categories,
  type Order, type InsertOrder, orders,
  type Restaurant, type InsertRestaurant, type UpdateRestaurant, restaurants,
  type RestaurantInfo,
  type RestaurantPhoto, type InsertRestaurantPhoto, restaurantPhotos,
  type RestaurantService, type InsertRestaurantService, restaurantServices,
  type CustomerLoyalty, type InsertCustomerLoyalty, customerLoyalty,
  type LoyaltyTransaction, type InsertLoyaltyTransaction, loyaltyTransactions,
  type PushSubscription as PushSub, type InsertPushSubscription, pushSubscriptions,
  generateSlug
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db, pool } from "./db";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  // Restaurants
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByOwner(ownerId: string): Promise<Restaurant | undefined>;
  getRestaurantBySlug(slug: string): Promise<Restaurant | undefined>;
  getRestaurantByCustomDomain(domain: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, updates: UpdateRestaurant): Promise<Restaurant | undefined>;
  deleteRestaurant(id: string): Promise<boolean>;
  
  // Categories
  getCategories(restaurantId: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Dishes
  getDishes(restaurantId: string): Promise<Dish[]>;
  getDish(id: string): Promise<Dish | undefined>;
  getDishesByCategory(categoryId: string): Promise<Dish[]>;
  createDish(dish: InsertDish): Promise<Dish>;
  updateDish(id: string, updates: Partial<InsertDish>): Promise<Dish | undefined>;
  deleteDish(id: string): Promise<boolean>;
  
  // Orders
  getOrders(restaurantId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<{ role: string; firstName: string; lastName: string; email: string; password: string; phone: string; address: string; profileImageUrl: string; restaurantId: string }>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Statistics
  getRestaurantStats(restaurantId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    todayOrders: number;
  }>;
  
  // Restaurant Customers
  getRestaurantCustomers(restaurantId: string): Promise<{ 
    id: string; 
    firstName: string | null; 
    lastName: string | null; 
    email: string | null; 
    phone: string | null;
    address: string | null;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date | null;
  }[]>;
  
  // Pagination
  getOrdersPaginated(restaurantId: string, page: number, limit: number): Promise<{ orders: Order[]; total: number }>;
  
  // Restaurant Photos
  getRestaurantPhotos(restaurantId: string): Promise<RestaurantPhoto[]>;
  getRestaurantPhoto(id: string): Promise<RestaurantPhoto | undefined>;
  createRestaurantPhoto(photo: InsertRestaurantPhoto): Promise<RestaurantPhoto>;
  updateRestaurantPhoto(id: string, updates: Partial<InsertRestaurantPhoto>): Promise<RestaurantPhoto | undefined>;
  deleteRestaurantPhoto(id: string): Promise<boolean>;
  
  // Restaurant Services (opening hours)
  getRestaurantServices(restaurantId: string): Promise<RestaurantService[]>;
  getRestaurantService(id: string): Promise<RestaurantService | undefined>;
  createRestaurantService(service: InsertRestaurantService): Promise<RestaurantService>;
  updateRestaurantService(id: string, updates: Partial<InsertRestaurantService>): Promise<RestaurantService | undefined>;
  deleteRestaurantService(id: string): Promise<boolean>;

  // Loyalty
  getCustomerLoyalty(customerId: string, restaurantId: string): Promise<CustomerLoyalty | undefined>;
  upsertCustomerLoyalty(customerId: string, restaurantId: string, pointsDelta: number, type: "earn" | "redeem"): Promise<CustomerLoyalty>;
  getLoyaltyTransactions(customerId: string, restaurantId: string): Promise<LoyaltyTransaction[]>;
  createLoyaltyTransaction(tx: InsertLoyaltyTransaction): Promise<LoyaltyTransaction>;

  // Push Subscriptions
  getPushSubscriptions(userId: string): Promise<PushSub[]>;
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSub>;
  deletePushSubscription(id: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Restaurant methods
  async getRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants);
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant || undefined;
  }

  async getRestaurantByOwner(ownerId: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
    return restaurant || undefined;
  }

  async getRestaurantBySlug(slug: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, slug));
    return restaurant || undefined;
  }

  async getRestaurantByCustomDomain(domain: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.customDomain, domain));
    return restaurant || undefined;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    let baseSlug = restaurant.slug || generateSlug(restaurant.name);
    let slug = baseSlug;
    let suffix = 1;
    
    while (await this.getRestaurantBySlug(slug)) {
      slug = `${baseSlug}${suffix}`;
      suffix++;
    }
    
    const [newRestaurant] = await db.insert(restaurants).values({ ...restaurant, slug }).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: string, updates: UpdateRestaurant): Promise<Restaurant | undefined> {
    const [updated] = await db.update(restaurants).set(updates).where(eq(restaurants.id, id)).returning();
    return updated || undefined;
  }

  async deleteRestaurant(id: string): Promise<boolean> {
    // Delete related data first (categories, dishes, orders, photos)
    await db.delete(dishes).where(eq(dishes.restaurantId, id));
    await db.delete(categories).where(eq(categories.restaurantId, id));
    await db.delete(orders).where(eq(orders.restaurantId, id));
    await db.delete(restaurantPhotos).where(eq(restaurantPhotos.restaurantId, id));
    const result = await db.delete(restaurants).where(eq(restaurants.id, id)).returning();
    return result.length > 0;
  }

  // Category methods
  async getCategories(restaurantId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.restaurantId, restaurantId)).orderBy(categories.sortOrder);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  // Dish methods
  async getDishes(restaurantId: string): Promise<Dish[]> {
    return await db.select().from(dishes).where(eq(dishes.restaurantId, restaurantId)).orderBy(dishes.sortOrder);
  }

  async getDish(id: string): Promise<Dish | undefined> {
    const [dish] = await db.select().from(dishes).where(eq(dishes.id, id));
    return dish || undefined;
  }

  async getDishesByCategory(categoryId: string): Promise<Dish[]> {
    return await db.select().from(dishes).where(eq(dishes.categoryId, categoryId)).orderBy(dishes.sortOrder);
  }

  async createDish(dish: InsertDish): Promise<Dish> {
    const [newDish] = await db.insert(dishes).values(dish).returning();
    return newDish;
  }

  async updateDish(id: string, updates: Partial<InsertDish>): Promise<Dish | undefined> {
    const [updated] = await db.update(dishes).set(updates).where(eq(dishes.id, id)).returning();
    return updated || undefined;
  }

  async deleteDish(id: string): Promise<boolean> {
    const result = await db.delete(dishes).where(eq(dishes.id, id)).returning();
    return result.length > 0;
  }

  // Order methods
  async getOrders(restaurantId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values({ ...order, status: "pending" }).returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<{ role: string; firstName: string; lastName: string; email: string; password: string; phone: string; address: string; profileImageUrl: string; restaurantId: string }>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getRestaurantStats(restaurantId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    todayOrders: number;
  }> {
    const allOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const pendingOrders = allOrders.filter(order => order.status === "pending").length;
    const todayOrders = allOrders.filter(order => {
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      return orderDate && orderDate >= today;
    }).length;

    return { totalOrders, totalRevenue, pendingOrders, todayOrders };
  }

  async getOrdersPaginated(restaurantId: string, page: number, limit: number): Promise<{ orders: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [countResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId));
    
    return { orders: orderList, total: countResult?.count || 0 };
  }

  // Restaurant Photos methods
  async getRestaurantPhotos(restaurantId: string): Promise<RestaurantPhoto[]> {
    return await db.select().from(restaurantPhotos).where(eq(restaurantPhotos.restaurantId, restaurantId)).orderBy(restaurantPhotos.sortOrder);
  }

  async getRestaurantPhoto(id: string): Promise<RestaurantPhoto | undefined> {
    const [photo] = await db.select().from(restaurantPhotos).where(eq(restaurantPhotos.id, id));
    return photo || undefined;
  }

  async createRestaurantPhoto(photo: InsertRestaurantPhoto): Promise<RestaurantPhoto> {
    const [newPhoto] = await db.insert(restaurantPhotos).values(photo).returning();
    return newPhoto;
  }

  async updateRestaurantPhoto(id: string, updates: Partial<InsertRestaurantPhoto>): Promise<RestaurantPhoto | undefined> {
    const [updated] = await db.update(restaurantPhotos).set(updates).where(eq(restaurantPhotos.id, id)).returning();
    return updated || undefined;
  }

  async deleteRestaurantPhoto(id: string): Promise<boolean> {
    const result = await db.delete(restaurantPhotos).where(eq(restaurantPhotos.id, id));
    return true;
  }

  // Restaurant Services methods
  async getRestaurantServices(restaurantId: string): Promise<RestaurantService[]> {
    return await db.select().from(restaurantServices).where(eq(restaurantServices.restaurantId, restaurantId)).orderBy(restaurantServices.sortOrder);
  }

  async getRestaurantService(id: string): Promise<RestaurantService | undefined> {
    const [service] = await db.select().from(restaurantServices).where(eq(restaurantServices.id, id));
    return service || undefined;
  }

  async createRestaurantService(service: InsertRestaurantService): Promise<RestaurantService> {
    const [newService] = await db.insert(restaurantServices).values(service).returning();
    return newService;
  }

  async updateRestaurantService(id: string, updates: Partial<InsertRestaurantService>): Promise<RestaurantService | undefined> {
    const [updated] = await db.update(restaurantServices).set(updates).where(eq(restaurantServices.id, id)).returning();
    return updated || undefined;
  }

  async deleteRestaurantService(id: string): Promise<boolean> {
    await db.delete(restaurantServices).where(eq(restaurantServices.id, id));
    return true;
  }

  // Loyalty methods
  async getCustomerLoyalty(customerId: string, restaurantId: string): Promise<CustomerLoyalty | undefined> {
    const [record] = await db.select().from(customerLoyalty).where(
      and(eq(customerLoyalty.customerId, customerId), eq(customerLoyalty.restaurantId, restaurantId))
    );
    return record || undefined;
  }

  async upsertCustomerLoyalty(customerId: string, restaurantId: string, pointsDelta: number, type: "earn" | "redeem"): Promise<CustomerLoyalty> {
    const existing = await this.getCustomerLoyalty(customerId, restaurantId);
    if (existing) {
      const newPoints = existing.points + (type === "earn" ? pointsDelta : -pointsDelta);
      const [updated] = await db.update(customerLoyalty).set({
        points: Math.max(0, newPoints),
        totalEarned: type === "earn" ? existing.totalEarned + pointsDelta : existing.totalEarned,
        totalRedeemed: type === "redeem" ? existing.totalRedeemed + pointsDelta : existing.totalRedeemed,
        updatedAt: new Date(),
      }).where(eq(customerLoyalty.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(customerLoyalty).values({
      customerId,
      restaurantId,
      points: type === "earn" ? pointsDelta : 0,
      totalEarned: type === "earn" ? pointsDelta : 0,
      totalRedeemed: 0,
    }).returning();
    return created;
  }

  async getLoyaltyTransactions(customerId: string, restaurantId: string): Promise<LoyaltyTransaction[]> {
    return await db.select().from(loyaltyTransactions).where(
      and(eq(loyaltyTransactions.customerId, customerId), eq(loyaltyTransactions.restaurantId, restaurantId))
    ).orderBy(desc(loyaltyTransactions.createdAt));
  }

  async createLoyaltyTransaction(tx: InsertLoyaltyTransaction): Promise<LoyaltyTransaction> {
    const [created] = await db.insert(loyaltyTransactions).values(tx).returning();
    return created;
  }

  async getRestaurantCustomers(restaurantId: string): Promise<{ 
    id: string; 
    firstName: string | null; 
    lastName: string | null; 
    email: string | null; 
    phone: string | null;
    address: string | null;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date | null;
  }[]> {
    // Get all customers registered to this restaurant
    const registeredCustomers = await db.select().from(users).where(
      and(
        eq(users.restaurantId, restaurantId),
        eq(users.role, "customer")
      )
    );
    
    // Get all orders for this restaurant to calculate stats
    const restaurantOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
    
    // Build order stats map
    const customerOrderStats = new Map<string, {
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: Date | null;
    }>();
    
    for (const order of restaurantOrders) {
      if (order.customerId) {
        const existing = customerOrderStats.get(order.customerId);
        const orderDate = order.createdAt ? new Date(order.createdAt) : null;
        
        if (existing) {
          existing.totalOrders++;
          existing.totalSpent += order.total || 0;
          if (orderDate && (!existing.lastOrderDate || orderDate > existing.lastOrderDate)) {
            existing.lastOrderDate = orderDate;
          }
        } else {
          customerOrderStats.set(order.customerId, {
            totalOrders: 1,
            totalSpent: order.total || 0,
            lastOrderDate: orderDate
          });
        }
      }
    }
    
    // Combine registered customers with their order stats
    return registeredCustomers.map(user => {
      const stats = customerOrderStats.get(user.id);
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        totalOrders: stats?.totalOrders ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
        lastOrderDate: stats?.lastOrderDate ?? null
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  async getPushSubscriptions(userId: string): Promise<PushSub[]> {
    return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSub> {
    const existing = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint));
    if (existing.length > 0) {
      const [updated] = await db.update(pushSubscriptions)
        .set({ userId: sub.userId, restaurantId: sub.restaurantId, p256dh: sub.p256dh, auth: sub.auth })
        .where(eq(pushSubscriptions.endpoint, sub.endpoint))
        .returning();
      return updated;
    }
    const [created] = await db.insert(pushSubscriptions).values(sub).returning();
    return created;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id)).returning();
    return result.length > 0;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
