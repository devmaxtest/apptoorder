import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, real, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export auth schema
export * from "./models/auth";

// Restaurants - each user can own a restaurant
export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(), // Links to users.id
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL-friendly identifier (e.g., "sugumaillane")
  name: text("name").notNull(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  openTime: text("open_time").default("09:00"),
  closeTime: text("close_time").default("22:00"),
  deliveryMinOrder: real("delivery_min_order").default(10),
  isOpen: boolean("is_open").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Branding
  primaryColor: varchar("primary_color", { length: 7 }).default("#f97316"), // Orange by default
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#1e293b"),
  accentColor: varchar("accent_color", { length: 7 }).default("#f97316"),
  
  // Custom domain
  customDomain: text("custom_domain"), // e.g., "order.myrestaurant.com"
  
  // Subscription/Billing
  subscriptionPlan: text("subscription_plan").default("starter"), // starter, pro, enterprise
  subscriptionPrice: real("subscription_price").default(99), // Monthly price in EUR
  subscriptionStatus: text("subscription_status").default("trial"), // trial, active, paused, cancelled
  subscriptionStartDate: timestamp("subscription_start_date").defaultNow(),
  nextBillingDate: timestamp("next_billing_date"),
  
  // Delivery zone - list of zip codes the restaurant delivers to
  deliveryZipCodes: text("delivery_zip_codes").array().default([]),
  
  // Landing Page Builder
  heroTitle: text("hero_title"), // Main headline
  heroSubtitle: text("hero_subtitle"), // Tagline
  heroImageUrl: text("hero_image_url"), // Background image
  heroCTAText: text("hero_cta_text").default("Commander maintenant"), // Call to action button text
  
  aboutText: text("about_text"), // About section description
  aboutImageUrl: text("about_image_url"), // About section image
  
  showHeroSection: boolean("show_hero_section").default(true),
  showAboutSection: boolean("show_about_section").default(true),
  showMenuSection: boolean("show_menu_section").default(true),
  showGallerySection: boolean("show_gallery_section").default(true),
  showContactSection: boolean("show_contact_section").default(true),
  
  // Social media links
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  
  // Banking information
  bankAccountHolder: text("bank_account_holder"), // Name on the bank account
  bankIban: text("bank_iban"), // IBAN
  bankBic: text("bank_bic"), // BIC/SWIFT code
  bankName: text("bank_name"), // Name of the bank

  // Client portal background
  clientBackgroundUrl: text("client_background_url"),
  clientBackgroundBlur: real("client_background_blur").default(0),
  clientBackgroundBrightness: real("client_background_brightness").default(1),
  clientBackgroundOverlayColor: varchar("client_background_overlay_color", { length: 7 }),
  clientBackgroundOverlayOpacity: real("client_background_overlay_opacity").default(0),

  // Preparation & delivery times
  estimatedPrepTime: real("estimated_prep_time"),
  estimatedDeliveryTime: real("estimated_delivery_time"),

  // Setup fee
  setupFee: real("setup_fee").default(0),
  setupFeePaid: boolean("setup_fee_paid").default(false),

  // HubRise POS integration
  hubriseAccessToken: text("hubrise_access_token"),
  hubriseRefreshToken: text("hubrise_refresh_token"),
  hubriseLocationId: text("hubrise_location_id"),
  hubriseCatalogId: text("hubrise_catalog_id"),
  hubriseCustomerListId: text("hubrise_customer_list_id"),
  hubriseConnected: boolean("hubrise_connected").default(false),

  // Stripe payment integration (restaurant's own account for receiving payments)
  stripeAccountId: text("stripe_account_id"),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeConnected: boolean("stripe_connected").default(false),

  // Stripe platform subscription (admin billing the restaurant)
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  // Loyalty programme config
  loyaltyEnabled: boolean("loyalty_enabled").default(false),
  loyaltyPointsPerEuro: integer("loyalty_points_per_euro").default(10),
  loyaltyPointsToRedeem: integer("loyalty_points_to_redeem").default(100),
  loyaltyRewardValue: real("loyalty_reward_value").default(5),
});

// Helper to generate URL-friendly slug from restaurant name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "") // Remove non-alphanumeric (no spaces/hyphens)
    .slice(0, 60);
}

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true, createdAt: true }).extend({
  slug: z.string().optional(), // Slug is auto-generated if not provided
});
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

// Helper to coerce ISO strings to Date objects (for JSON payloads)
const coercibleDate = z.preprocess((val) => {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;
  if (typeof val === 'string') return new Date(val);
  return val;
}, z.date().nullable().optional());

// Update schema includes branding, billing, and custom domain fields
export const updateRestaurantSchema = z.object({
  name: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional().or(z.literal("")),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  deliveryMinOrder: z.number().optional(),
  isOpen: z.boolean().optional(),
  // Branding
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  // Custom domain
  customDomain: z.string().nullable().optional(),
  // Subscription
  subscriptionPlan: z.string().optional(),
  subscriptionPrice: z.number().optional(),
  subscriptionStatus: z.string().optional(),
  subscriptionStartDate: coercibleDate,
  nextBillingDate: coercibleDate,
  // Delivery zone
  deliveryZipCodes: z.array(z.string()).optional(),
  // Landing Page Builder
  heroTitle: z.string().nullable().optional(),
  heroSubtitle: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroCTAText: z.string().nullable().optional(),
  aboutText: z.string().nullable().optional(),
  aboutImageUrl: z.string().nullable().optional(),
  showHeroSection: z.boolean().optional(),
  showAboutSection: z.boolean().optional(),
  showMenuSection: z.boolean().optional(),
  showGallerySection: z.boolean().optional(),
  showContactSection: z.boolean().optional(),
  // Social media
  facebookUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  // Banking information
  bankAccountHolder: z.string().nullable().optional(),
  bankIban: z.string().nullable().optional(),
  bankBic: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  // Stripe platform subscription
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  // Loyalty
  loyaltyEnabled: z.boolean().optional(),
  loyaltyPointsPerEuro: z.number().int().min(1).optional(),
  loyaltyPointsToRedeem: z.number().int().min(1).optional(),
  loyaltyRewardValue: z.number().min(0).optional(),
});
export type UpdateRestaurant = z.infer<typeof updateRestaurantSchema>;

// Categories for dishes - linked to restaurant
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: real("sort_order").default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Dishes/Menu items - linked to restaurant
export const dishes = pgTable("dishes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  categoryId: varchar("category_id").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: real("sort_order").default(0),
});

export const insertDishSchema = createInsertSchema(dishes).omit({ id: true });
export type InsertDish = z.infer<typeof insertDishSchema>;
export type Dish = typeof dishes.$inferSelect;

// Order item schema for cart and order
export const orderItemSchema = z.object({
  dishId: z.string(),
  quantity: z.number().int().min(1),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

// Validated order item (with dish details - server-side enriched)
export const validatedOrderItemSchema = orderItemSchema.extend({
  name: z.string(),
  price: z.number(),
});
export type ValidatedOrderItem = z.infer<typeof validatedOrderItemSchema>;

// Request schema for creating orders (client sends this)
export const createOrderRequestSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  customerAddress: z.string().nullable().optional(),
  customerPostalCode: z.string().nullable().optional(), // Required for delivery, validated server-side
  orderType: z.enum(["delivery", "pickup"]).default("delivery"),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

// Order table (stores validated items as JSON) - linked to restaurant
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  customerId: varchar("customer_id"), // Links to authenticated customer (optional for guest orders)
  items: text("items").notNull(), // JSON string of ValidatedOrderItem[]
  total: real("total").notNull(),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentMethod: text("payment_method").default("cash"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address"),
  orderType: text("order_type").notNull().default("delivery"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, status: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Restaurant info type (for backward compatibility)
export interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  openTime: string;
  closeTime: string;
  deliveryMinOrder: number;
  isOpen: boolean;
}

// Restaurant gallery photos
export const restaurantPhotos = pgTable("restaurant_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  sortOrder: real("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRestaurantPhotoSchema = createInsertSchema(restaurantPhotos).omit({ id: true, createdAt: true });
export type InsertRestaurantPhoto = z.infer<typeof insertRestaurantPhotoSchema>;
export type RestaurantPhoto = typeof restaurantPhotos.$inferSelect;

// Restaurant services (opening hours) - e.g., lunch 11:30-14:30, dinner 18:30-22:30
export const restaurantServices = pgTable("restaurant_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull(),
  name: text("name").notNull(), // e.g., "Déjeuner", "Dîner"
  startTime: text("start_time").notNull(), // e.g., "11:30"
  endTime: text("end_time").notNull(), // e.g., "14:30"
  sortOrder: real("sort_order").default(0),
});

export const insertRestaurantServiceSchema = createInsertSchema(restaurantServices).omit({ id: true });
export type InsertRestaurantService = z.infer<typeof insertRestaurantServiceSchema>;
export type RestaurantService = typeof restaurantServices.$inferSelect;

// Loyalty — customer points balance per restaurant
export const customerLoyalty = pgTable("customer_loyalty", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  restaurantId: varchar("restaurant_id").notNull(),
  points: integer("points").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalRedeemed: integer("total_redeemed").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerLoyaltySchema = createInsertSchema(customerLoyalty).omit({ id: true, updatedAt: true });
export type InsertCustomerLoyalty = z.infer<typeof insertCustomerLoyaltySchema>;
export type CustomerLoyalty = typeof customerLoyalty.$inferSelect;

// Loyalty transactions log
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  restaurantId: varchar("restaurant_id").notNull(),
  orderId: varchar("order_id"),
  type: text("type").notNull(), // "earn" | "redeem"
  points: integer("points").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({ id: true, createdAt: true });
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  restaurantId: varchar("restaurant_id"),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
