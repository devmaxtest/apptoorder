/**
 * COBA Integration Helpers
 * High-level integration points for tracking common events
 */

import { coba } from './cobaClient';

// Track page navigation
export function trackPageView(path: string, restaurantId?: string) {
  coba.pageView(path, restaurantId);
}

// Global error handler
export function setupGlobalErrorTracking() {
  window.addEventListener('error', (event) => {
    coba.trackError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    coba.trackError(event.reason || 'Unhandled Promise rejection', {
      type: 'unhandledrejection',
    });
  });
}

// Track React Query errors
export function trackQueryError(error: any, queryKey: any) {
  coba.trackError(error, {
    type: 'query_error',
    queryKey: String(queryKey),
  });
}

// Track order creation
export function trackOrderCreated(orderId: string, restaurantId: string, total: number, itemCount: number) {
  coba.trackOrder(orderId, restaurantId, total, itemCount);
}

// Track API performance
export function trackApiCall(endpoint: string, duration: number, success: boolean, restaurantId?: string) {
  coba.trackPerformance(`api_${endpoint}`, duration, restaurantId);
  
  if (!success) {
    coba.track('error', {
      type: 'api_error',
      endpoint,
      duration,
    }, restaurantId);
  }
}

// Track slow requests
export function trackSlowRequest(endpoint: string, duration: number, threshold: number = 3000) {
  if (duration > threshold) {
    coba.track('performance', {
      type: 'slow_request',
      endpoint,
      duration,
      threshold,
    });
  }
}
