import { useEffect } from "react";
import { Switch, Route, useParams, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import AdminPortal from "@/pages/admin-portal";
import AdminCobaDashboard from "@/pages/admin-coba-dashboard";
import ProLogin from "@/pages/pro-login";
import ProPortal from "@/pages/pro-portal";
import ProMyBusiness from "@/pages/pro-mybusiness";
import CreateRestaurant from "@/pages/create-restaurant";
import ClientPortal from "@/pages/client-portal";
import RestaurantPage from "@/pages/restaurant";
import RestaurantPublic from "@/pages/restaurant-public";
import ClientRestaurantPortal from "@/pages/client-restaurant-portal";
import OrderDetails from "@/pages/order-details";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { setupGlobalErrorTracking, trackPageView } from "@/lib/cobaIntegration";

function ProPortalWithSlug() {
  const { slug } = useParams<{ slug: string }>();
  return <ProPortal slug={slug} />;
}

function ProMyBusinessWithSlug() {
  const { slug } = useParams<{ slug: string }>();
  return <ProMyBusiness slug={slug || ""} />;
}

function RestaurantPublicWithSlug() {
  const { slug } = useParams<{ slug: string }>();
  return <RestaurantPublic slug={slug || ""} />;
}

function ClientRestaurantPortalWithSlug() {
  const { slug } = useParams<{ slug: string }>();
  return <ClientRestaurantPortal slug={slug || ""} />;
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/123admin" component={AdminPortal} />
      <Route path="/123admin/monitoring" component={AdminCobaDashboard} />
      <Route path="/login" component={LoginPage} />
      <Route path="/pro" component={ProLogin} />
      <Route path="/pro/create" component={CreateRestaurant} />
      <Route path="/pro/:slug/mybusiness">{() => <ProMyBusinessWithSlug />}</Route>
      <Route path="/pro/:slug">{() => <ProPortalWithSlug />}</Route>
      <Route path="/client" component={ClientPortal} />
      <Route path="/order/:id" component={OrderDetails} />
      <Route path="/restaurant/:id" component={RestaurantPage} />
      <Route path="/:slug/client">{() => <ClientRestaurantPortalWithSlug />}</Route>
      <Route path="/:slug">{() => <RestaurantPublicWithSlug />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    setupGlobalErrorTracking();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
