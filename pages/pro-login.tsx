import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ChefHat, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { User, Restaurant } from "@shared/schema";

export default function ProLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });

  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/my-restaurant"],
    enabled: !!user && user.role === "restaurant_owner",
  });

  useEffect(() => {
    if (user && user.role === "restaurant_owner" && restaurant?.slug) {
      navigate(`/pro/${restaurant.slug}`);
    }
  }, [user, restaurant, navigate]);

  if (user && user.role === "restaurant_owner" && restaurant?.slug) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/pro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loginForm, rememberMe }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connexion echouee");
      }

      toast({ title: "Connexion reussie", description: "Redirection vers votre tableau de bord..." });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/my-restaurant"] });
      
      if (data.slug) {
        navigate(`/pro/${data.slug}`);
      } else {
        toast({ 
          title: "Aucun restaurant", 
          description: "Contactez l'administrateur pour creer votre restaurant.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Connexion echouee",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ChefHat className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Espace Professionnel</CardTitle>
            <CardDescription>
              Connectez-vous pour gerer votre restaurant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pro-email">Email</Label>
                <Input
                  id="pro-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  data-testid="input-pro-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pro-password">Mot de passe</Label>
                <Input
                  id="pro-password"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                  data-testid="input-pro-password"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me-pro-login"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  data-testid="checkbox-remember-me-pro-login"
                />
                <Label htmlFor="remember-me-pro-login" className="text-sm font-normal cursor-pointer">
                  Se souvenir de moi
                </Label>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-pro-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>


            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Vous n'avez pas de compte?</p>
              <p className="mt-1">Contactez l'administrateur de la plateforme pour creer votre restaurant.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
