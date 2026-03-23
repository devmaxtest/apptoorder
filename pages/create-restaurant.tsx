import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChefHat, ArrowLeft, Shield } from "lucide-react";

export default function CreateRestaurant() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="font-bold text-lg">macommande.shop</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Restaurant Creation</CardTitle>
            <CardDescription>
              Only platform administrators can create restaurant accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              If you would like to register your restaurant on macommande.shop, please contact an administrator who will set up your account.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setLocation("/")}
                data-testid="button-go-home"
              >
                Go to Home
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/client")}
                data-testid="button-go-client"
              >
                Browse as Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
