import { db } from "../server/db";
import { users } from "../shared/models/auth";
import { restaurants, categories, dishes, orders, generateSlug } from "../shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Starting database seed...");

  // Hash passwords for test accounts
  const proPassword = await bcrypt.hash("pro123", 10);
  const clientPassword = await bcrypt.hash("client123", 10);
  const adminPassword = await bcrypt.hash("@MDBH13011", 10);

  // Create admin account
  const adminUser = {
    id: "50962629",
    email: "mauriced@apptoo.com",
    password: adminPassword,
    firstName: "Admin",
    lastName: "Master",
    role: "admin",
    phone: "+33 4 91 00 00 00",
    address: "1 Place du Marché, 13001 Marseille"
  };

  // Create 3 Pro (restaurant owner) accounts
  const proUsers = [
    {
      id: "pro-user-1",
      email: "chef.martin@example.com",
      password: proPassword,
      firstName: "Pierre",
      lastName: "Martin",
      role: "restaurant_owner",
      phone: "+33 4 91 00 00 01",
      address: "10 Rue de la République, 13001 Marseille"
    },
    {
      id: "pro-user-2",
      email: "chef.dubois@example.com",
      password: proPassword,
      firstName: "Marie",
      lastName: "Dubois",
      role: "restaurant_owner",
      phone: "+33 4 91 00 00 02",
      address: "25 Cours Julien, 13006 Marseille"
    },
    {
      id: "pro-user-3",
      email: "chef.bernard@example.com",
      password: proPassword,
      firstName: "Jean",
      lastName: "Bernard",
      role: "restaurant_owner",
      phone: "+33 4 91 00 00 03",
      address: "5 Quai du Port, 13002 Marseille"
    }
  ];

  // Create 3 Client (customer) accounts - each linked to a specific restaurant
  const clientUsers = [
    {
      id: "client-user-1",
      email: "sophie.laurent@example.com",
      password: clientPassword,
      firstName: "Sophie",
      lastName: "Laurent",
      role: "customer",
      phone: "+33 6 12 34 56 01",
      address: "15 Boulevard Longchamp, 13001 Marseille",
      restaurantId: "restaurant-1" // Client of Le Vieux Port
    },
    {
      id: "client-user-2",
      email: "thomas.moreau@example.com",
      password: clientPassword,
      firstName: "Thomas",
      lastName: "Moreau",
      role: "customer",
      phone: "+33 6 12 34 56 02",
      address: "42 Rue Paradis, 13006 Marseille",
      restaurantId: "restaurant-2" // Client of Chez Marie
    },
    {
      id: "client-user-3",
      email: "camille.petit@example.com",
      password: clientPassword,
      firstName: "Camille",
      lastName: "Petit",
      role: "customer",
      phone: "+33 6 12 34 56 03",
      address: "8 Avenue du Prado, 13008 Marseille",
      restaurantId: "restaurant-3" // Client of La Bouillabaisse
    }
  ];

  console.log("Creating Admin user...");
  await db.insert(users).values(adminUser).onConflictDoNothing();

  console.log("Creating Pro users...");
  for (const user of proUsers) {
    await db.insert(users).values(user).onConflictDoNothing();
  }

  console.log("Creating Client users...");
  for (const user of clientUsers) {
    await db.insert(users).values(user).onConflictDoNothing();
  }

  // Create 3 Restaurants in Marseille
  const restaurantData = [
    {
      id: "restaurant-1",
      ownerId: "pro-user-1",
      slug: "le-vieux-port",
      name: "Le Vieux Port",
      address: "10 Rue de la République, 13001 Marseille, France",
      phone: "+33 4 91 00 00 01",
      openTime: "11:00",
      closeTime: "22:00",
      deliveryMinOrder: 15,
      isOpen: true,
      primaryColor: "#1e40af",
      secondaryColor: "#3b82f6",
      accentColor: "#60a5fa",
      subscriptionPlan: "pro",
      subscriptionPrice: 99,
      subscriptionStatus: "active",
      subscriptionStartDate: new Date("2024-01-15"),
      nextBillingDate: new Date("2025-01-15")
    },
    {
      id: "restaurant-2",
      ownerId: "pro-user-2",
      slug: "chez-marie",
      name: "Chez Marie",
      address: "25 Cours Julien, 13006 Marseille, France",
      phone: "+33 4 91 00 00 02",
      openTime: "12:00",
      closeTime: "23:00",
      deliveryMinOrder: 20,
      isOpen: true,
      primaryColor: "#dc2626",
      secondaryColor: "#ef4444",
      accentColor: "#f87171",
      subscriptionPlan: "starter",
      subscriptionPrice: 49,
      subscriptionStatus: "active",
      subscriptionStartDate: new Date("2024-06-01"),
      nextBillingDate: new Date("2025-01-01")
    },
    {
      id: "restaurant-3",
      ownerId: "pro-user-3",
      slug: "la-bouillabaisse",
      name: "La Bouillabaisse",
      address: "5 Quai du Port, 13002 Marseille, France",
      phone: "+33 4 91 00 00 03",
      openTime: "10:00",
      closeTime: "21:00",
      deliveryMinOrder: 25,
      isOpen: true,
      primaryColor: "#059669",
      secondaryColor: "#10b981",
      accentColor: "#34d399",
      subscriptionPlan: "pro",
      subscriptionPrice: 99,
      subscriptionStatus: "trial",
      subscriptionStartDate: new Date("2024-12-01"),
      nextBillingDate: new Date("2025-01-01")
    }
  ];

  console.log("Creating Restaurants...");
  for (const restaurant of restaurantData) {
    await db.insert(restaurants).values(restaurant).onConflictDoNothing();
  }

  // Create Categories for each restaurant
  const categoryData = [
    // Le Vieux Port categories
    { id: "cat-1-1", restaurantId: "restaurant-1", name: "Entrées", nameEn: "Starters", sortOrder: 1 },
    { id: "cat-1-2", restaurantId: "restaurant-1", name: "Plats", nameEn: "Main Courses", sortOrder: 2 },
    { id: "cat-1-3", restaurantId: "restaurant-1", name: "Desserts", nameEn: "Desserts", sortOrder: 3 },
    // Chez Marie categories
    { id: "cat-2-1", restaurantId: "restaurant-2", name: "Salades", nameEn: "Salads", sortOrder: 1 },
    { id: "cat-2-2", restaurantId: "restaurant-2", name: "Pizzas", nameEn: "Pizzas", sortOrder: 2 },
    { id: "cat-2-3", restaurantId: "restaurant-2", name: "Pâtes", nameEn: "Pasta", sortOrder: 3 },
    // La Bouillabaisse categories
    { id: "cat-3-1", restaurantId: "restaurant-3", name: "Fruits de Mer", nameEn: "Seafood", sortOrder: 1 },
    { id: "cat-3-2", restaurantId: "restaurant-3", name: "Poissons", nameEn: "Fish", sortOrder: 2 },
    { id: "cat-3-3", restaurantId: "restaurant-3", name: "Spécialités", nameEn: "Specialties", sortOrder: 3 }
  ];

  console.log("Creating Categories...");
  for (const category of categoryData) {
    await db.insert(categories).values(category).onConflictDoNothing();
  }

  // Create Dishes for each restaurant
  const dishData = [
    // Le Vieux Port dishes
    { id: "dish-1-1", restaurantId: "restaurant-1", categoryId: "cat-1-1", name: "Soupe de Poisson", description: "Traditional fish soup with rouille", price: 12.50, isAvailable: true, sortOrder: 1 },
    { id: "dish-1-2", restaurantId: "restaurant-1", categoryId: "cat-1-1", name: "Salade Niçoise", description: "Fresh tuna salad with olives", price: 14.00, isAvailable: true, sortOrder: 2 },
    { id: "dish-1-3", restaurantId: "restaurant-1", categoryId: "cat-1-2", name: "Bouillabaisse Marseillaise", description: "Authentic Marseille fish stew", price: 38.00, isAvailable: true, sortOrder: 1 },
    { id: "dish-1-4", restaurantId: "restaurant-1", categoryId: "cat-1-2", name: "Loup Grillé", description: "Grilled sea bass with herbs", price: 28.00, isAvailable: true, sortOrder: 2 },
    { id: "dish-1-5", restaurantId: "restaurant-1", categoryId: "cat-1-3", name: "Tarte Tropézienne", description: "Cream-filled brioche cake", price: 9.00, isAvailable: true, sortOrder: 1 },
    // Chez Marie dishes
    { id: "dish-2-1", restaurantId: "restaurant-2", categoryId: "cat-2-1", name: "Salade César", description: "Caesar salad with chicken", price: 13.00, isAvailable: true, sortOrder: 1 },
    { id: "dish-2-2", restaurantId: "restaurant-2", categoryId: "cat-2-1", name: "Salade Chèvre Chaud", description: "Warm goat cheese salad", price: 14.50, isAvailable: true, sortOrder: 2 },
    { id: "dish-2-3", restaurantId: "restaurant-2", categoryId: "cat-2-2", name: "Pizza Margherita", description: "Tomato, mozzarella, basil", price: 12.00, isAvailable: true, sortOrder: 1 },
    { id: "dish-2-4", restaurantId: "restaurant-2", categoryId: "cat-2-2", name: "Pizza Quatre Fromages", description: "Four cheese pizza", price: 15.00, isAvailable: true, sortOrder: 2 },
    { id: "dish-2-5", restaurantId: "restaurant-2", categoryId: "cat-2-3", name: "Spaghetti Carbonara", description: "Cream sauce with bacon", price: 14.00, isAvailable: true, sortOrder: 1 },
    // La Bouillabaisse dishes
    { id: "dish-3-1", restaurantId: "restaurant-3", categoryId: "cat-3-1", name: "Plateau de Fruits de Mer", description: "Seafood platter for 2", price: 65.00, isAvailable: true, sortOrder: 1 },
    { id: "dish-3-2", restaurantId: "restaurant-3", categoryId: "cat-3-1", name: "Huîtres (12 pcs)", description: "Fresh oysters", price: 24.00, isAvailable: true, sortOrder: 2 },
    { id: "dish-3-3", restaurantId: "restaurant-3", categoryId: "cat-3-2", name: "Filet de Dorade", description: "Sea bream fillet with vegetables", price: 26.00, isAvailable: true, sortOrder: 1 },
    { id: "dish-3-4", restaurantId: "restaurant-3", categoryId: "cat-3-2", name: "Thon Mi-Cuit", description: "Seared tuna with sesame", price: 29.00, isAvailable: true, sortOrder: 2 },
    { id: "dish-3-5", restaurantId: "restaurant-3", categoryId: "cat-3-3", name: "Bouillabaisse Royale", description: "Premium fish stew with lobster", price: 55.00, isAvailable: true, sortOrder: 1 }
  ];

  console.log("Creating Dishes...");
  for (const dish of dishData) {
    await db.insert(dishes).values(dish).onConflictDoNothing();
  }

  // Create test orders (delivery and takeaway)
  const orderData = [
    // Orders for Le Vieux Port - delivery and takeaway
    {
      id: "order-1-1",
      restaurantId: "restaurant-1",
      customerId: "client-user-1",
      items: JSON.stringify([
        { dishId: "dish-1-1", name: "Soupe de Poisson", quantity: 2, price: 12.50 },
        { dishId: "dish-1-3", name: "Bouillabaisse Marseillaise", quantity: 1, price: 38.00 }
      ]),
      total: 63.00,
      status: "delivered",
      customerName: "Sophie Laurent",
      customerPhone: "+33 6 12 34 56 01",
      customerAddress: "15 Boulevard Longchamp, 13001 Marseille",
      orderType: "delivery",
      createdAt: new Date("2024-12-20T12:30:00")
    },
    {
      id: "order-1-2",
      restaurantId: "restaurant-1",
      customerId: "client-user-2",
      items: JSON.stringify([
        { dishId: "dish-1-4", name: "Loup Grillé", quantity: 2, price: 28.00 },
        { dishId: "dish-1-5", name: "Tarte Tropézienne", quantity: 2, price: 9.00 }
      ]),
      total: 74.00,
      status: "ready",
      customerName: "Thomas Moreau",
      customerPhone: "+33 6 12 34 56 02",
      customerAddress: null,
      orderType: "takeaway",
      createdAt: new Date("2024-12-21T18:45:00")
    },
    // Orders for Chez Marie - delivery and takeaway
    {
      id: "order-2-1",
      restaurantId: "restaurant-2",
      customerId: "client-user-3",
      items: JSON.stringify([
        { dishId: "dish-2-3", name: "Pizza Margherita", quantity: 2, price: 12.00 },
        { dishId: "dish-2-5", name: "Spaghetti Carbonara", quantity: 1, price: 14.00 }
      ]),
      total: 38.00,
      status: "delivered",
      customerName: "Camille Petit",
      customerPhone: "+33 6 12 34 56 03",
      customerAddress: "8 Avenue du Prado, 13008 Marseille",
      orderType: "delivery",
      createdAt: new Date("2024-12-21T19:15:00")
    },
    {
      id: "order-2-2",
      restaurantId: "restaurant-2",
      customerId: "client-user-1",
      items: JSON.stringify([
        { dishId: "dish-2-1", name: "Salade César", quantity: 1, price: 13.00 },
        { dishId: "dish-2-4", name: "Pizza Quatre Fromages", quantity: 1, price: 15.00 }
      ]),
      total: 28.00,
      status: "pending",
      customerName: "Sophie Laurent",
      customerPhone: "+33 6 12 34 56 01",
      customerAddress: null,
      orderType: "takeaway",
      createdAt: new Date("2024-12-22T12:00:00")
    },
    // Orders for La Bouillabaisse - delivery and takeaway
    {
      id: "order-3-1",
      restaurantId: "restaurant-3",
      customerId: "client-user-2",
      items: JSON.stringify([
        { dishId: "dish-3-1", name: "Plateau de Fruits de Mer", quantity: 1, price: 65.00 },
        { dishId: "dish-3-2", name: "Huîtres (12 pcs)", quantity: 1, price: 24.00 }
      ]),
      total: 89.00,
      status: "preparing",
      customerName: "Thomas Moreau",
      customerPhone: "+33 6 12 34 56 02",
      customerAddress: "42 Rue Paradis, 13006 Marseille",
      orderType: "delivery",
      createdAt: new Date("2024-12-22T11:30:00")
    },
    {
      id: "order-3-2",
      restaurantId: "restaurant-3",
      customerId: "client-user-3",
      items: JSON.stringify([
        { dishId: "dish-3-5", name: "Bouillabaisse Royale", quantity: 2, price: 55.00 }
      ]),
      total: 110.00,
      status: "delivered",
      customerName: "Camille Petit",
      customerPhone: "+33 6 12 34 56 03",
      customerAddress: null,
      orderType: "takeaway",
      createdAt: new Date("2024-12-20T20:00:00")
    },
    // Additional orders to test today's analytics
    {
      id: "order-1-3",
      restaurantId: "restaurant-1",
      customerId: "client-user-3",
      items: JSON.stringify([
        { dishId: "dish-1-2", name: "Salade Niçoise", quantity: 1, price: 14.00 },
        { dishId: "dish-1-3", name: "Bouillabaisse Marseillaise", quantity: 2, price: 38.00 }
      ]),
      total: 90.00,
      status: "pending",
      customerName: "Camille Petit",
      customerPhone: "+33 6 12 34 56 03",
      customerAddress: "8 Avenue du Prado, 13008 Marseille",
      orderType: "delivery",
      createdAt: new Date()
    }
  ];

  console.log("Creating Orders...");
  for (const order of orderData) {
    await db.insert(orders).values(order).onConflictDoNothing();
  }

  console.log("\n========================================");
  console.log("SEED COMPLETED SUCCESSFULLY!");
  console.log("========================================\n");

  console.log("ADMIN ACCOUNT:");
  console.log("----------------------------------");
  console.log(`Email: ${adminUser.email}`);
  console.log(`Password: @MDBH13008`);
  console.log(`Access: /admin`);
  console.log("");
  
  console.log("PRO ACCOUNTS (Restaurant Owners):");
  console.log("----------------------------------");
  proUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: pro123`);
    console.log(`   Restaurant: ${restaurantData[i].name}`);
    console.log(`   Dashboard: /${restaurantData[i].slug}`);
    console.log("");
  });
  
  console.log("\nCLIENT ACCOUNTS (Customers - each exclusive to one restaurant):");
  console.log("----------------------------------");
  clientUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: client123`);
    console.log(`   Restaurant: ${restaurantData[i].name}`);
    console.log(`   Order at: /restaurant/${restaurantData[i].id}`);
    console.log("");
  });
  
  console.log("\nORDER SUMMARY:");
  console.log("----------------------------------");
  console.log("Total Orders: 7");
  console.log("- Delivery Orders: 4");
  console.log("- Takeaway Orders: 3");
  console.log("- Pending: 2, Preparing: 1, Ready: 1, Delivered: 3");
  console.log("\nTotal Revenue: 492.00 EUR");
  
  console.log("\n========================================");
  console.log("LOGIN: Go to /login to sign in");
  console.log("========================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
