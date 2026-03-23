/**
 * MaxAI COBA Client SDK
 * Sends events and tracking data to the COBA monitoring API
 */

interface CobaEvent {
  type: 'page_view' | 'error' | 'order' | 'performance' | 'user_action';
  timestamp: number;
  tenantId?: string;
  userId?: string;
  data: Record<string, any>;
  context?: {
    url?: string;
    userAgent?: string;
    viewport?: string;
  };
}

interface CobaConfig {
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
  tenantId?: string;
  batchSize?: number;
  flushInterval?: number;
}

class CobaClient {
  private config: CobaConfig;
  private eventQueue: CobaEvent[] = [];
  private flushTimer: number | null = null;

  constructor(config: CobaConfig) {
    this.config = {
      batchSize: 50,
      flushInterval: 10000,
      ...config,
    };

    if (this.config.enabled) {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private getContext() {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  track(type: CobaEvent['type'], data: Record<string, any>, tenantId?: string) {
    if (!this.config.enabled) return;

    const event: CobaEvent = {
      type,
      timestamp: Date.now(),
      tenantId: tenantId || this.config.tenantId || 'platform',
      data,
      context: this.getContext(),
    };

    // Add user ID if available
    const userIdStr = sessionStorage.getItem('userId');
    if (userIdStr) {
      try {
        event.userId = JSON.parse(userIdStr);
      } catch {}
    }

    this.eventQueue.push(event);

    if (this.eventQueue.length >= (this.config.batchSize || 50)) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => this.flush(), this.config.flushInterval || 10000);
    }
  }

  pageView(path: string, tenantId?: string) {
    this.track('page_view', { path }, tenantId);
  }

  trackError(error: Error | string, context?: Record<string, any>, tenantId?: string) {
    const errorData = {
      message: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    };
    this.track('error', errorData, tenantId);
  }

  trackOrder(orderId: string, restaurantId: string, total: number, itemCount: number) {
    this.track('order', {
      orderId,
      restaurantId,
      total,
      itemCount,
    }, restaurantId);
  }

  trackPerformance(metric: string, duration: number, tenantId?: string) {
    this.track('performance', { metric, duration }, tenantId);
  }

  trackUserAction(action: string, target: string, tenantId?: string) {
    this.track('user_action', { action, target }, tenantId);
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventQueue.length === 0 || !this.config.enabled) return;

    const events = this.eventQueue.splice(0, this.eventQueue.length);

    const payload = events.map(e => ({
      eventType: e.type,
      timestamp: e.timestamp,
      tenantId: e.tenantId || 'platform',
      userId: e.userId || null,
      data: e.data,
      context: e.context,
    }));

    try {
      const response = await fetch(`${this.config.apiUrl}/api/coba/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-coba-key': this.config.apiKey,
        },
        body: JSON.stringify({ events: payload }),
        keepalive: true,
      });

      if (!response.ok) {
        console.warn(`COBA: Failed to send events (${response.status})`);
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.warn('COBA: Failed to flush events', error);
      // Re-queue events on error
      this.eventQueue.unshift(...events);
    }
  }
}

// Initialize global COBA client
const cobaConfig: CobaConfig = {
  apiUrl: import.meta.env.VITE_COBA_API_URL || 'http://localhost:5000',
  apiKey: import.meta.env.VITE_COBA_API_KEY || '',
  enabled: !!import.meta.env.VITE_COBA_API_KEY,
};

export const coba = new CobaClient(cobaConfig);

export default coba;
