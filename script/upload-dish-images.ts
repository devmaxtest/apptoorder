import { Storage } from "@google-cloud/storage";
import { db } from "../server/db";
import { dishes } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

interface DishImageMapping {
  dishId: string;
  dishName: string;
  imagePath: string;
}

const dishImageMappings: DishImageMapping[] = [
  // Le Vieux Portable dishes
  { dishId: "dish-1-1", dishName: "Soupe de Poisson", imagePath: "attached_assets/stock_images/traditional_fish_sou_48ec1e15.jpg" },
  { dishId: "dish-1-2", dishName: "Salade Nicoise", imagePath: "attached_assets/stock_images/nicoise_salad_with_t_210a03ea.jpg" },
  { dishId: "dish-1-3", dishName: "Bouillabaisse Marseillaise", imagePath: "attached_assets/stock_images/french_bouillabaisse_1d54252a.jpg" },
  { dishId: "dish-1-4", dishName: "Loup Grille", imagePath: "attached_assets/stock_images/grilled_sea_bass_fis_3e24a626.jpg" },
  { dishId: "dish-1-5", dishName: "Tarte Tropezienne", imagePath: "attached_assets/stock_images/tarte_tropezienne_cr_29fc9762.jpg" },

  // Chez Marie dishes
  { dishId: "dish-2-1", dishName: "Salade Cesar", imagePath: "attached_assets/stock_images/fresh_caesar_salad_w_35a3dccc.jpg" },
  { dishId: "dish-2-2", dishName: "Salade Chevre Chaud", imagePath: "attached_assets/stock_images/warm_goat_cheese_sal_91aec77d.jpg" },
  { dishId: "dish-2-3", dishName: "Pizza Margherita", imagePath: "attached_assets/stock_images/pizza_margherita_ita_630be6a0.jpg" },
  { dishId: "dish-2-4", dishName: "Pizza Quatre Fromages", imagePath: "attached_assets/stock_images/four_cheese_pizza_qu_eb19b6d3.jpg" },
  { dishId: "dish-2-5", dishName: "Spaghetti Carbonara", imagePath: "attached_assets/stock_images/spaghetti_carbonara__f6d3f56d.jpg" },

  // La Bouillabaisse dishes
  { dishId: "dish-3-1", dishName: "Plateau de Fruits de Mer", imagePath: "attached_assets/stock_images/seafood_platter_frui_fce9bf3a.jpg" },
  { dishId: "dish-3-2", dishName: "Huitres", imagePath: "attached_assets/stock_images/fresh_oysters_on_pla_7351aba3.jpg" },
  { dishId: "dish-3-3", dishName: "Filet de Dorade", imagePath: "attached_assets/stock_images/sea_bream_dorade_fis_e4cbbfbc.jpg" },
  { dishId: "dish-3-4", dishName: "Thon Mi-Cuit", imagePath: "attached_assets/stock_images/seared_tuna_sesame_m_d85ab911.jpg" },
  { dishId: "dish-3-5", dishName: "Bouillabaisse Royale", imagePath: "attached_assets/stock_images/lobster_fish_stew_bo_951648c4.jpg" },

  // SUGU dishes
  { dishId: "4dc80149-a1d5-472c-bf57-feb50bfff181", dishName: "Sushi Saumon", imagePath: "attached_assets/stock_images/salmon_sushi_nigiri__28388f50.jpg" },
  { dishId: "b1a73906-47fb-448d-83ad-fbe0b7a5c31b", dishName: "Sushi Crevette", imagePath: "attached_assets/stock_images/shrimp_sushi_nigiri__071ba32e.jpg" },
  { dishId: "de7d658d-5853-4891-a0bc-3a94aa6ea4b7", dishName: "Sushi Thon", imagePath: "attached_assets/stock_images/tuna_sushi_nigiri_ja_16c3e74d.jpg" },
  { dishId: "5d481673-8d37-42ef-88b0-822f7a6f9c04", dishName: "Maki Saumon", imagePath: "attached_assets/stock_images/salmon_maki_roll_jap_aa634db1.jpg" },
  { dishId: "a93024e2-d51c-4b1c-9b0a-afda3a2c1a0d", dishName: "Maki Avocat", imagePath: "attached_assets/stock_images/avocado_maki_roll_ve_827047a5.jpg" },
  { dishId: "af1fc78d-71eb-4f05-be28-65dc7a48fff7", dishName: "California Roll", imagePath: "attached_assets/stock_images/california_roll_sush_9b58291f.jpg" },
  { dishId: "3a57a806-f3ea-4e00-900c-9694dd46c9c4", dishName: "Chirashi Saumon", imagePath: "attached_assets/stock_images/chirashi_salmon_rice_6b3da070.jpg" },
  { dishId: "671ad438-a252-45ee-9d0f-c19a43e3a3d9", dishName: "Ramen Tonkotsu", imagePath: "attached_assets/stock_images/tonkotsu_ramen_pork__ce43c6d3.jpg" },
  { dishId: "63a50ea7-41b3-4575-8521-7739c4754b78", dishName: "Gyoza", imagePath: "attached_assets/stock_images/gyoza_dumplings_japa_2576e060.jpg" },
  { dishId: "6e81a280-5306-4317-aaea-25173681fb7e", dishName: "Tempura Crevettes", imagePath: "attached_assets/stock_images/tempura_shrimp_fried_4a7bcfc6.jpg" },
  { dishId: "a1fd06ac-2bc9-4d66-ae15-07cbfab6e3e7", dishName: "Poulet Teriyaki", imagePath: "attached_assets/stock_images/chicken_teriyaki_ric_11fa7efb.jpg" },
  { dishId: "afe068d9-13c5-4668-8c9b-de12e18d3b7d", dishName: "Edamame", imagePath: "attached_assets/stock_images/edamame_soybeans_jap_2e4e11d5.jpg" },
  { dishId: "909746ee-e8e0-46a0-a90f-89c0c56b8eb2", dishName: "Salade de chou", imagePath: "attached_assets/stock_images/japanese_coleslaw_ca_1b167c8a.jpg" },
  { dishId: "da69bbe3-0f88-4c34-8586-1a5cb1c40a90", dishName: "Cheesecake Matcha", imagePath: "attached_assets/stock_images/matcha_cheesecake_gr_667c064e.jpg" },
  { dishId: "d72d4733-2735-4450-847f-e79330c5adf7", dishName: "Mochi Glace", imagePath: "attached_assets/stock_images/mochi_ice_cream_japa_2e44ab42.jpg" },
];

async function uploadDishImages() {
  const publicSearchPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  const publicPath = publicSearchPaths.split(",")[0]?.trim();
  
  if (!publicPath) {
    console.error("PUBLIC_OBJECT_SEARCH_PATHS not set");
    process.exit(1);
  }

  // Parse bucket name from public path (format: /bucket-name/path)
  const pathParts = publicPath.split("/").filter(Boolean);
  const bucketName = pathParts[0];
  const basePath = pathParts.slice(1).join("/");

  console.log(`Using bucket: ${bucketName}, base path: ${basePath}`);

  const bucket = objectStorageClient.bucket(bucketName);

  for (const mapping of dishImageMappings) {
    try {
      // Check if local file exists
      if (!fs.existsSync(mapping.imagePath)) {
        console.error(`Image file not found: ${mapping.imagePath}`);
        continue;
      }

      // Generate destination path
      const fileName = path.basename(mapping.imagePath);
      const destinationPath = `${basePath}/dishes/${mapping.dishId}/${fileName}`;

      console.log(`Uploading ${mapping.dishName} (${mapping.dishId})...`);

      // Upload file to GCS
      await bucket.upload(mapping.imagePath, {
        destination: destinationPath,
        metadata: {
          contentType: "image/jpeg",
        },
      });

      // Construct the public URL
      const imageUrl = `/public/${destinationPath.replace(basePath + "/", "")}`;

      // Update database
      await db
        .update(dishes)
        .set({ imageUrl })
        .where(eq(dishes.id, mapping.dishId));

      console.log(`  Updated: ${mapping.dishName} -> ${imageUrl}`);
    } catch (error) {
      console.error(`Failed to upload ${mapping.dishName}:`, error);
    }
  }

  console.log("Done!");
  process.exit(0);
}

uploadDishImages();
