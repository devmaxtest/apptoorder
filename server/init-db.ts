import { db } from "./db";
import { users } from "../shared/models/auth";
import { eq } from "drizzle-orm";

export async function initializeDatabase() {
  console.log("Checking database initialization...");
  
  try {
    const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL;
    const masterAdminPasswordHash = process.env.MASTER_ADMIN_PASSWORD_HASH;

    if (!masterAdminEmail || !masterAdminPasswordHash) {
      console.error("MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD_HASH environment variables are not set. Skipping master admin initialization.");
      return;
    }
    
    const existingAdminByEmail = await db.select().from(users).where(eq(users.email, masterAdminEmail)).limit(1);
    const existingAdminById = await db.select().from(users).where(eq(users.id, "50962629")).limit(1);
    const existingAdmin = existingAdminByEmail.length > 0 ? existingAdminByEmail : existingAdminById;
    
    if (existingAdmin.length === 0) {
      console.log("Master admin not found, creating...");
      
      await db.insert(users).values({
        id: "50962629",
        email: masterAdminEmail,
        password: masterAdminPasswordHash,
        firstName: "Admin",
        lastName: "Master",
        role: "admin",
        isMasterAdmin: "true",
        phone: "+33 4 91 00 00 00",
        address: "1 Place du Marché, 13001 Marseille"
      }).onConflictDoNothing();
      
      console.log("Master admin created successfully");
    } else {
      const admin = existingAdmin[0];
      if (admin.role !== "admin" || admin.isMasterAdmin !== "true" || admin.email !== masterAdminEmail || admin.password !== masterAdminPasswordHash) {
        console.log("Master admin found but needs repair, fixing...");
        await db.update(users).set({
          role: "admin",
          isMasterAdmin: "true",
          email: masterAdminEmail,
          password: masterAdminPasswordHash,
        }).where(eq(users.id, admin.id));
        console.log("Master admin repaired successfully");
      } else {
        console.log("Master admin already exists");
      }
    }
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}
