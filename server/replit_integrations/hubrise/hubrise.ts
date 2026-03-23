import type { 
  HubRiseConfig, 
  HubRiseOrder, 
  HubRiseCustomer, 
  HubRiseCatalog,
  HubRiseTokenResponse 
} from "./types";

const HUBRISE_API_BASE = "https://api.hubrise.com/v1";
const HUBRISE_OAUTH_BASE = "https://manager.hubrise.com/oauth2/v1";

export class HubRiseService {
  private config: HubRiseConfig;

  constructor(config: HubRiseConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    if (!this.config.accessToken) {
      throw new Error("HubRise access token not configured. Complete OAuth flow first.");
    }
    return {
      "X-Access-Token": this.config.accessToken,
      "Content-Type": "application/json",
    };
  }

  getOAuthURL(redirectUri: string, scope: string = "location[orders.write,catalog.read]", state?: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      redirect_uri: redirectUri,
      scope,
      client_id: this.config.clientId,
    });
    if (state) {
      params.append("state", state);
    }
    return `${HUBRISE_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<HubRiseTokenResponse> {
    const response = await fetch(`${HUBRISE_OAUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokenData = await response.json() as HubRiseTokenResponse;
    
    this.config.accessToken = tokenData.access_token;
    if (tokenData.refresh_token) {
      this.config.refreshToken = tokenData.refresh_token;
    }
    if (tokenData.location_id) {
      this.config.locationId = tokenData.location_id;
    }
    if (tokenData.catalog_id) {
      this.config.catalogId = tokenData.catalog_id;
    }

    return tokenData;
  }

  async createOrder(order: HubRiseOrder): Promise<{ id: string; status: string }> {
    const response = await fetch(`${HUBRISE_API_BASE}/location/orders`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create HubRise order: ${error}`);
    }

    return response.json();
  }

  async getOrder(orderId: string): Promise<HubRiseOrder & { id: string }> {
    const response = await fetch(`${HUBRISE_API_BASE}/location/orders/${orderId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get HubRise order: ${error}`);
    }

    return response.json();
  }

  async updateOrderStatus(orderId: string, status: HubRiseOrder["status"]): Promise<void> {
    const response = await fetch(`${HUBRISE_API_BASE}/location/orders/${orderId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update HubRise order status: ${error}`);
    }
  }

  async getOrders(status?: string, after?: string): Promise<Array<HubRiseOrder & { id: string }>> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (after) params.append("after", after);

    const url = `${HUBRISE_API_BASE}/location/orders${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get HubRise orders: ${error}`);
    }

    return response.json();
  }

  async createOrUpdateCustomer(customer: HubRiseCustomer, customerListId: string): Promise<{ id: string }> {
    const endpoint = customer.id 
      ? `${HUBRISE_API_BASE}/customer_lists/${customerListId}/customers/${customer.id}`
      : `${HUBRISE_API_BASE}/customer_lists/${customerListId}/customers`;
    
    const method = customer.id ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: this.getHeaders(),
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create/update HubRise customer: ${error}`);
    }

    return response.json();
  }

  async getCatalog(catalogId?: string): Promise<HubRiseCatalog> {
    const id = catalogId || this.config.catalogId;
    if (!id) {
      throw new Error("Catalog ID not configured");
    }

    const response = await fetch(`${HUBRISE_API_BASE}/catalogs/${id}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get HubRise catalog: ${error}`);
    }

    return response.json();
  }

  async pushCatalog(catalog: HubRiseCatalog, catalogId?: string): Promise<void> {
    const id = catalogId || this.config.catalogId;
    if (!id) {
      throw new Error("Catalog ID not configured");
    }

    const response = await fetch(`${HUBRISE_API_BASE}/catalogs/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(catalog),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to push HubRise catalog: ${error}`);
    }
  }

  async registerCallback(url: string, events: Record<string, string[]>): Promise<{ id: string }> {
    const response = await fetch(`${HUBRISE_API_BASE}/callback`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ url, events }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register HubRise callback: ${error}`);
    }

    return response.json();
  }

  async deleteCallback(): Promise<void> {
    const response = await fetch(`${HUBRISE_API_BASE}/callback`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete HubRise callback: ${error}`);
    }
  }

  getConfig(): HubRiseConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<HubRiseConfig>): void {
    Object.assign(this.config, updates);
  }
}
