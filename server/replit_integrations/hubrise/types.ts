export interface HubRiseConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  locationId?: string;
  catalogId?: string;
}

export interface HubRiseOrderItem {
  product_name: string;
  sku_ref?: string;
  price: string;
  quantity: number;
  options?: Array<{
    option_list_name: string;
    name: string;
    ref?: string;
    price?: string;
  }>;
}

export interface HubRisePayment {
  type: "online" | "cash" | "card";
  amount: string;
  info?: Record<string, string>;
}

export interface HubRiseOrder {
  status: "new" | "received" | "accepted" | "in_preparation" | "awaiting_shipment" | "awaiting_collection" | "in_delivery" | "completed" | "rejected" | "cancelled" | "delivery_failed";
  private_ref?: string;
  service_type?: "delivery" | "collection" | "eat_in";
  service_type_ref?: string;
  expected_time?: string;
  confirmed_time?: string;
  customer_id?: string;
  customer_private_ref?: string;
  customer_notes?: string;
  seller_notes?: string;
  items: HubRiseOrderItem[];
  payments?: HubRisePayment[];
  deals?: Array<{
    name: string;
    ref?: string;
    lines: Array<{
      product_name: string;
      sku_ref?: string;
      quantity: number;
      pricing_effect?: string;
      pricing_value?: string;
    }>;
  }>;
  discounts?: Array<{
    name: string;
    ref?: string;
    pricing_effect: "discount" | "percentage_off";
    pricing_value: string;
  }>;
  charges?: Array<{
    type: "delivery" | "service" | "tip" | "tax" | "other";
    name: string;
    ref?: string;
    price: string;
  }>;
  total?: string;
  custom_fields?: Record<string, string>;
}

export interface HubRiseCustomer {
  id?: string;
  private_ref?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  delivery_notes?: string;
  custom_fields?: Record<string, string>;
}

export interface HubRiseCallback {
  resource_type: "order" | "customer" | "catalog" | "location" | "inventory";
  event_type: "create" | "update";
  resource_id: string;
  resource_url: string;
  account_id: string;
  location_id?: string;
  customer_list_id?: string;
  catalog_id?: string;
  timestamp: string;
}

export interface HubRiseCatalogProduct {
  name: string;
  description?: string;
  ref?: string;
  category_ref?: string;
  image_ids?: string[];
  skus: Array<{
    name?: string;
    ref: string;
    price: string;
    option_list_refs?: string[];
  }>;
}

export interface HubRiseCatalogCategory {
  name: string;
  ref: string;
  parent_ref?: string;
  description?: string;
}

export interface HubRiseCatalog {
  name: string;
  categories?: HubRiseCatalogCategory[];
  products?: HubRiseCatalogProduct[];
}

export interface HubRiseTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  account_id?: string;
  location_id?: string;
  catalog_id?: string;
  customer_list_id?: string;
}
