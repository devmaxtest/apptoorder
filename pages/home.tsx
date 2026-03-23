import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, MapPin, Phone, Clock, ChefHat, Briefcase, UtensilsCrossed,
  ArrowRight, Check, Star, Shield, Zap, BarChart3, CreditCard, Users,
  Store, Smartphone, Globe, TrendingUp, ChevronDown, ChevronRight,
  ShoppingBag, Receipt, Building2, FileText, Camera, Wallet, Menu, X,
  Bot, MessageCircle, BrainCircuit, Activity, LineChart, Bell, Sparkles, Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Restaurant } from "@shared/schema";

const ADMIN_DOMAINS = ["apptoorder.replit.app"];

function isAdminDomain(): boolean {
  const hostname = window.location.hostname;
  return ADMIN_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
}

function MockBrowser({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl overflow-hidden border border-border/50 bg-card shadow-2xl ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/80 border-b border-border/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-background/60 rounded-md px-3 py-1 text-[11px] text-muted-foreground text-center truncate">
            {title}
          </div>
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function MockClientPortal() {
  return (
    <MockBrowser title="macommande.shop/la-bella-vita/client" className="w-full max-w-lg">
      <div className="bg-gradient-to-b from-orange-950 to-neutral-950 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/30 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-white font-semibold text-sm">La Bella Vita</span>
          </div>
          <Badge className="bg-green-500/20 text-green-400 text-[10px] border-0">Ouvert</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {["Antipasti", "Pizzas", "Pâtes", "Desserts"].map(cat => (
            <div key={cat} className="bg-white/5 rounded-lg px-3 py-2 text-center text-white/80 text-xs border border-white/10 hover:bg-white/10 transition-colors cursor-default">
              {cat}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { name: "Pizza Margherita", price: "12,90" },
            { name: "Penne Arrabiata", price: "11,50" },
            { name: "Tiramisu Maison", price: "7,90" },
          ].map(item => (
            <div key={item.name} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><UtensilsCrossed className="w-4 h-4 text-orange-400" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{item.name}</p>
                <p className="text-orange-400 text-xs font-bold">{item.price} EUR</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold cursor-default">+</div>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-orange-500 rounded-lg py-2 px-4 flex items-center justify-between">
          <span className="text-white text-xs font-semibold">3 articles - 32,30 EUR</span>
          <span className="text-white text-[10px] flex items-center gap-1">Commander <ArrowRight className="w-3 h-3" /></span>
        </div>
      </div>
    </MockBrowser>
  );
}

function MockProDashboard() {
  return (
    <MockBrowser title="macommande.shop/pro/la-bella-vita" className="w-full max-w-2xl">
      <div className="bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-neutral-950 dark:to-orange-950/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">Tableau de bord</h3>
          <Badge className="bg-orange-500 text-white text-[10px] border-0">Pro</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Aujourd'hui", value: "12", icon: ShoppingBag, color: "text-blue-500" },
            { label: "En attente", value: "3", icon: Clock, color: "text-orange-500" },
            { label: "Total", value: "847", icon: TrendingUp, color: "text-green-500" },
            { label: "CA", value: "18.4k", icon: Wallet, color: "text-purple-500" },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-lg p-2.5 border border-border/50 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-base font-bold text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Commandes récentes</span>
            <span className="text-[10px] text-muted-foreground">Temps réel</span>
          </div>
          {[
            { name: "Kelly D.", total: "27,30", status: "En préparation", color: "bg-orange-500" },
            { name: "Alain C.", total: "18,50", status: "Livrée", color: "bg-green-500" },
            { name: "Marie L.", total: "42,00", status: "Confirmée", color: "bg-blue-500" },
          ].map((o, i) => (
            <div key={i} className="px-3 py-2 flex items-center justify-between border-b border-border/30 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">{o.name[0]}</div>
                <span className="text-xs text-foreground">{o.name}</span>
              </div>
              <span className="text-xs font-mono font-semibold text-foreground">{o.total} EUR</span>
              <Badge className={`${o.color} text-white text-[9px] border-0`}>{o.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </MockBrowser>
  );
}

function MockMyBusiness() {
  return (
    <MockBrowser title="macommande.shop/pro/la-bella-vita/mybusiness" className="w-full max-w-2xl">
      <div className="bg-gradient-to-br from-[#0a0a12] to-[#12121f] p-4">
        <div className="flex items-center gap-2 mb-4">
          {["Dashboard", "Achats", "Frais", "Banque", "Caisse", "RH"].map((tab, i) => (
            <span key={tab} className={`px-2.5 py-1 rounded-md text-[10px] font-medium cursor-default ${i === 0 ? "bg-orange-500 text-white" : "text-white/50 bg-white/5"}`}>{tab}</span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Chiffre d'affaires", value: "48 250 EUR", trend: "+12%", color: "from-green-500/20 to-green-500/5" },
            { label: "Charges totales", value: "31 890 EUR", trend: "-3%", color: "from-red-500/20 to-red-500/5" },
            { label: "Résultat net", value: "16 360 EUR", trend: "+28%", color: "from-blue-500/20 to-blue-500/5" },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-lg p-3 border border-white/10`}>
              <p className="text-[9px] text-white/50 mb-1">{s.label}</p>
              <p className="text-sm font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-green-400">{s.trend}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-1.5 mb-2">
              <Receipt className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-white/70 font-medium">Rapprochement bancaire</span>
            </div>
            <div className="space-y-1.5">
              {["Loyer bureau", "Fournisseur A", "Électricité"].map((item, i) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50">{item}</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${i < 2 ? "bg-green-500/20" : "bg-orange-500/20"}`}>
                    {i < 2 ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Clock className="w-2.5 h-2.5 text-orange-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-white/70 font-medium">Gestion RH</span>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "Sophie M.", role: "Serveuse", status: "CDI" },
                { name: "Thomas R.", role: "Cuisinier", status: "CDI" },
                { name: "Léa K.", role: "Caissière", status: "CDD" },
              ].map(emp => (
                <div key={emp.name} className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50">{emp.name} - {emp.role}</span>
                  <span className="text-[8px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{emp.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockBrowser>
  );
}

function MockMobile() {
  return (
    <div className="w-[220px] mx-auto">
      <div className="rounded-[28px] border-[3px] border-neutral-700 bg-neutral-950 overflow-hidden shadow-2xl">
        <div className="bg-neutral-950 px-6 pt-2 pb-1 flex justify-center">
          <div className="w-20 h-5 bg-neutral-900 rounded-full" />
        </div>
        <div className="bg-gradient-to-b from-orange-950 to-neutral-950 px-3 py-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center">
                <UtensilsCrossed className="w-3 h-3 text-orange-400" />
              </div>
              <span className="text-white font-semibold text-[10px]">Bella Vita</span>
            </div>
            <ShoppingBag className="w-4 h-4 text-white/60" />
          </div>
          <div className="space-y-1.5 mb-2">
            {[
              { name: "Bruschetta x3", price: "8,90" },
              { name: "Calzone Ricotta", price: "13,50" },
              { name: "Panna Cotta", price: "6,90" },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between bg-white/5 rounded-lg px-2 py-1.5 border border-white/10">
                <div>
                  <p className="text-white text-[9px] font-medium">{item.name}</p>
                  <p className="text-orange-400 text-[9px] font-bold">{item.price} EUR</p>
                </div>
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[9px] font-bold">+</div>
              </div>
            ))}
          </div>
          <div className="bg-orange-500 rounded-lg py-1.5 text-center">
            <span className="text-white text-[9px] font-semibold">Commander</span>
          </div>
        </div>
        <div className="bg-neutral-950 h-4 flex justify-center items-end pb-1">
          <div className="w-16 h-1 bg-neutral-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function MockMaxAI() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-card shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="text-sm font-semibold">MaxAI Assistant</span>
              <span className="text-[10px] border border-white/40 text-white/80 px-1.5 py-0.5 rounded-full">COBA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-white/70">En ligne</span>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-3 bg-muted/30">
          <div className="flex gap-2 justify-end">
            <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs max-w-[75%]">
              Quel est mon chiffre d'affaires ce mois-ci ?
            </div>
          </div>
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border shadow-sm rounded-lg px-3 py-2 text-xs max-w-[80%] text-foreground">
              Votre CA ce mois : <span className="font-bold text-green-600 dark:text-green-400">12 450 EUR</span> (+18% vs mois dernier). Vous avez 87 commandes avec un panier moyen de 143 EUR.
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs max-w-[75%]">
              Des anomalies détectées ?
            </div>
          </div>
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border shadow-sm rounded-lg px-3 py-2 text-xs max-w-[80%] text-foreground">
              <span className="text-orange-500 font-medium">1 alerte :</span> Charge fournisseur "BioFresh" en hausse de 35% par rapport au trimestre précédent. Je recommande une renégociation.
            </div>
          </div>
        </div>
        <div className="p-2 border-t bg-background flex gap-2">
          <div className="flex-1 bg-muted/50 rounded-md px-3 py-1.5 text-xs text-muted-foreground">Posez votre question...</div>
          <div className="w-8 h-8 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg flex items-center justify-center relative">
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white">2</span>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-2">Widget flottant déplaçable</p>
    </div>
  );
}

function FAQItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-1 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={`faq-toggle-${id}`}
      >
        <span className="text-sm font-medium text-foreground pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} role="region" className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</div>
      )}
    </div>
  );
}

function LandingPage() {
  const [, navigate] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const restaurantsRef = useRef<HTMLDivElement>(null);

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: lc } = useQuery<any>({
    queryKey: ["/api/landing-content"],
  });

  const scrollToRestaurants = () => {
    restaurantsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <nav className="border-b bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2" data-testid="link-home">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground" data-testid="text-site-title">macommande.shop</span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={scrollToRestaurants} className="hover:text-foreground transition-colors" data-testid="nav-restaurants">Restaurants</button>
            <a href="#features" className="hover:text-foreground transition-colors" data-testid="nav-features">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors" data-testid="nav-pricing">Tarifs</a>
            <a href="#faq" className="hover:text-foreground transition-colors" data-testid="nav-faq">FAQ</a>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => navigate("/pro")} data-testid="button-acces-pro">
              <Briefcase className="h-4 w-4 mr-1.5" /> Espace Pro
            </Button>
            <Button size="sm" onClick={() => navigate("/pro/create")} data-testid="button-essai-gratuit">
              Essai gratuit <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)} data-testid="button-mobile-menu">
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
            <button onClick={() => { scrollToRestaurants(); setMobileMenu(false); }} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">Restaurants</button>
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-sm text-muted-foreground hover:text-foreground">Fonctionnalités</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-sm text-muted-foreground hover:text-foreground">Tarifs</a>
            <a href="#faq" onClick={() => setMobileMenu(false)} className="block text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <div className="pt-2 flex items-center gap-2">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Mode sombre / clair</span>
            </div>
            <div className="pt-1 flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigate("/pro"); setMobileMenu(false); }} className="w-full justify-center">Espace Pro</Button>
              <Button size="sm" onClick={() => { navigate("/pro/create"); setMobileMenu(false); }} className="w-full justify-center">Essai gratuit</Button>
            </div>
          </div>
        )}
      </nav>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 dark:from-primary/10 dark:to-primary/5" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5" data-testid="badge-hero">
                <Zap className="w-3 h-3 mr-1" /> {lc?.hero?.badge || "0% commission sur vos commandes"}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6" data-testid="text-hero-title">
                {lc?.hero?.title1 || "Votre restaurant."}{" "}
                <span className="text-primary">{lc?.hero?.titleHighlight || "Vos commandes."}</span>{" "}
                {lc?.hero?.title2 || "Vos revenus."}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="text-hero-subtitle">
                {lc?.hero?.subtitle || "Commande en ligne, gestion financière, comptabilité, RH, caisse connectée et assistant IA — tout dans une seule plateforme. Sans commission. Sans engagement."}
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <Button size="lg" onClick={() => navigate("/pro/create")} data-testid="button-hero-cta">
                  {lc?.hero?.ctaPrimary || "Démarrer gratuitement"} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={scrollToRestaurants} data-testid="button-hero-demo">
                  {lc?.hero?.ctaSecondary || "Voir la démo"}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {lc?.hero?.check1 || "0% commission"}</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {lc?.hero?.check2 || "Sans engagement"}</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> {lc?.hero?.check3 || "En ligne en 5 min"}</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <MockClientPortal />
            </div>
          </div>
        </div>
      </section>
      {/* PROBLEM / SOLUTION */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-problem-title">{lc?.problem?.title || "0% de commissions"}</h2>
            <p className="text-muted-foreground text-lg">
              {lc?.problem?.subtitle || "Les plateformes de livraison prennent jusqu'à 30% de commission. Avec macommande.shop, vous gardez 100% de vos revenus."}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="font-semibold text-foreground">{lc?.problem?.marketplaceTitle || "Avec les marketplaces"}</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {(lc?.problem?.marketplaceItems || ["25-30% de commission par commande", "Aucune donnée client (emails, préférences)", "Pas de branding — votre restaurant noyé parmi 200 autres", "Dépendance totale à l'algorithme"]).map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> {item}</li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{lc?.problem?.marketplaceResult || "Sur 1 000 EUR de ventes = 300 EUR perdus"}</p>
              </div>
            </div>
            <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="font-semibold text-foreground">{lc?.problem?.usTitle || "Avec macommande.shop"}</h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {(lc?.problem?.usItems || ["0% commission — abonnement fixe prévisible", "Vos clients, vos données, votre fidélisation", "Votre marque, vos couleurs, votre domaine", "+ Comptabilité, RH et gestion financière incluses"]).map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> {item}</li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{lc?.problem?.usResult || "Sur 1 000 EUR de ventes = 1 000 EUR pour vous"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* FEATURES — with visuals */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
            <BarChart3 className="w-3 h-3 mr-1" /> {lc?.features?.badge || "Tout-en-un"}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-features-title">
            {lc?.features?.title || "Bien plus qu'une simple commande en ligne"}
          </h2>
          <p className="text-muted-foreground text-lg">
            {lc?.features?.subtitle || "La seule plateforme qui réunit commande, gestion financière, comptabilité, RH et intelligence artificielle pour les restaurants indépendants."}
          </p>
        </div>

        {/* Feature 1 — Client Portal */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">{lc?.features?.clientPortal?.label || "Portail Client"}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {lc?.features?.clientPortal?.title || "Menu digital et commande en ligne"}
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {lc?.features?.clientPortal?.description || "Vos clients commandent directement depuis votre propre site, à vos couleurs. Menu interactif, panier en temps réel, suivi de commande — tout est fluide et sans friction."}
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {(lc?.features?.clientPortal?.checks || ["Menu interactif avec catégories et options", "Livraison et à emporter", "Suivi de commande en temps réel", "Programme de fidélité intégré", "Responsive mobile — pas besoin d'app"]).map((c: string, i: number) => (
                <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {c}</li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2 flex gap-6 items-center justify-center">
            <MockMobile />
            <div className="hidden sm:block">
              <MockClientPortal />
            </div>
          </div>
        </div>

        {/* Feature 2 — Pro Dashboard */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="flex justify-center">
            <MockProDashboard />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">{lc?.features?.proDashboard?.label || "Espace Pro"}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {lc?.features?.proDashboard?.title || "Gérez votre restaurant en temps réel"}
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {lc?.features?.proDashboard?.description || "Tableau de bord complet avec statistiques en direct, gestion du menu en drag-and-drop, suivi des commandes en temps réel, et personnalisation totale de votre vitrine."}
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {(lc?.features?.proDashboard?.checks || ["Statistiques en temps réel (CA, commandes, clients)", "Gestion menu drag-and-drop avec options", "Notifications instantanées (WebSocket)", "Branding personnalisé (couleurs, logo, hero)", "Factures PDF automatiques"]).map((c: string, i: number) => (
                <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3 — MyBusiness */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">{lc?.features?.myBusiness?.label || "MyBusiness"}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {lc?.features?.myBusiness?.title || "Comptabilité et RH — sans logiciel supplémentaire"}
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {lc?.features?.myBusiness?.description || "Ce qu'aucun concurrent ne fait : une suite complète de gestion financière et RH intégrée directement dans votre espace restaurant. Fini les 3 logiciels différents."}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(() => {
                const moduleIcons = [ShoppingBag, Receipt, Building2, Camera, Users, FileText];
                const moduleColors = ["text-orange-500 bg-orange-500/10", "text-blue-500 bg-blue-500/10", "text-green-500 bg-green-500/10", "text-purple-500 bg-purple-500/10", "text-pink-500 bg-pink-500/10", "text-cyan-500 bg-cyan-500/10"];
                const modules = lc?.features?.myBusiness?.modules || ["Achats fournisseurs", "Frais généraux", "Rapprochement bancaire", "Scan tickets (OCR)", "Gestion RH & Paie", "Import PDF paie"];
                return modules.map((label: string, idx: number) => ({ icon: moduleIcons[idx % moduleIcons.length], label, color: moduleColors[idx % moduleColors.length] }));
              })().map((f: any) => (
                <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card">
                  <div className={`w-7 h-7 rounded-md ${f.color} flex items-center justify-center flex-shrink-0`}>
                    <f.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 flex justify-center">
            <MockMyBusiness />
          </div>
        </div>

        {/* Feature 4 — POS Integration */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <MockBrowser title="Intégration HubRise — 40+ caisses" className="w-full">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-neutral-950 dark:to-blue-950/20 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">HubRise Connecté</p>
                      <p className="text-[10px] text-green-500">Synchronisation active</p>
                    </div>
                    <Badge className="ml-auto bg-green-500 text-white text-[10px] border-0">En ligne</Badge>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: "LEO2", status: "Compatible" },
                      { name: "Zelty", status: "Compatible" },
                      { name: "Lightspeed", status: "Compatible" },
                      { name: "Tiller", status: "Compatible" },
                      { name: "iKentoo", status: "Compatible" },
                    ].map(pos => (
                      <div key={pos.name} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border/50">
                        <span className="text-xs font-medium text-foreground">{pos.name}</span>
                        <span className="text-[10px] text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> {pos.status}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground mt-3">+ 35 autres systèmes de caisse</p>
                </div>
              </MockBrowser>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">{lc?.features?.pos?.label || "Caisse Connectée"}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {lc?.features?.pos?.title || "Connecté à votre caisse existante"}
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {lc?.features?.pos?.description || "Grâce à HubRise, les commandes en ligne arrivent directement dans votre caisse. Compatible avec 40+ systèmes POS : LEO2, Zelty, Lightspeed, Tiller, iKentoo et bien d'autres."}
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {(lc?.features?.pos?.checks || ["Synchronisation automatique des commandes", "Compatible 40+ systèmes POS", "Connexion en 1 clic via OAuth", "Catalogue synchronisé"]).map((c: string, i: number) => (
                <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 5 — MaxAI COBA */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">{lc?.features?.maxai?.label || "MaxAI par COBA"}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {lc?.features?.maxai?.title || "Votre assistant intelligent, intégré à votre restaurant"}
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {lc?.features?.maxai?.description || "MaxAI analyse vos données financières, détecte les anomalies, et répond à vos questions en temps réel. Un expert financier disponible 24h/24, directement dans votre tableau de bord."}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(() => {
                const aiIcons = [MessageCircle, LineChart, Bell, Eye, Sparkles, Activity];
                const aiColors = ["text-purple-500 bg-purple-500/10", "text-indigo-500 bg-indigo-500/10", "text-orange-500 bg-orange-500/10", "text-blue-500 bg-blue-500/10", "text-pink-500 bg-pink-500/10", "text-green-500 bg-green-500/10"];
                const mods = lc?.features?.maxai?.modules || ["Chat intelligent", "Analyse financière", "Alertes anomalies", "Monitoring 24/7", "Recommandations IA", "Suivi performance"];
                return mods.map((label: string, idx: number) => ({ icon: aiIcons[idx % aiIcons.length], label, color: aiColors[idx % aiColors.length] }));
              })().map((f: any) => (
                <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card">
                  <div className={`w-7 h-7 rounded-md ${f.color} flex items-center justify-center flex-shrink-0`}>
                    <f.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{f.label}</span>
                </div>
              ))}
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {(lc?.features?.maxai?.checks || ["Posez vos questions en langage naturel", "Analyse automatique de vos achats, frais et CA", "Détection d'anomalies et alertes proactives", "Widget déplaçable — ne gêne jamais votre travail"]).map((c: string, i: number) => (
                <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {c}</li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2 flex justify-center">
            <MockMaxAI />
          </div>
        </div>
      </section>
      {/* STATS BAR */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            {(lc?.stats || [
              { value: "0%", label: "Commission" },
              { value: "5 min", label: "Mise en ligne" },
              { value: "40+", label: "Caisses compatibles" },
              { value: "MaxAI", label: "Assistant IA intégré" },
              { value: "99 EUR", label: "À partir de / mois" },
            ]).map((s: any) => (
              <div key={s.label}>
                <p className="text-3xl md:text-4xl font-extrabold mb-1">{s.value}</p>
                <p className="text-sm opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* PRICING */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-pricing-title">
            {lc?.pricing?.title || "Tarifs simples, sans surprise"}
          </h2>
          <p className="text-muted-foreground text-lg">
            {lc?.pricing?.subtitle || "Pas de commission, pas de frais cachés. Un abonnement mensuel fixe adapté à vos besoins."}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(lc?.pricing?.plans || [
            { name: "Starter", price: "99", desc: "Idéal pour démarrer avec la commande en ligne", features: ["Site de commande personnalisé", "Gestion du menu en temps réel", "Suivi des commandes", "Statistiques de base", "Support par email"], cta: "Commencer", popular: false },
            { name: "Website + App", price: "149", desc: "Pour les restaurants qui veulent tout gérer", features: ["Tout le plan Starter", "MyBusiness (comptabilité, RH, banque)", "MaxAI — assistant IA par COBA", "Intégration HubRise (caisse)", "Domaine personnalisé", "Scan tickets & import PDF", "Support prioritaire"], cta: "Choisir ce plan", popular: true },
            { name: "Premium", price: "Sur devis", desc: "Solution sur mesure pour groupes et chaînes", features: ["Tout le plan Website + App", "Multi-sites centralisé", "API personnalisée", "Formation équipe", "Account manager dédié", "SLA garanti"], cta: "Nous contacter", popular: false },
          ]).map((plan: any) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.popular
                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-lg scale-[1.02]"
                  : "border-border/50 bg-card"
              }`}
              data-testid={`card-plan-${plan.name.toLowerCase().replace(/\s/g, "-")}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0">
                  <Star className="w-3 h-3 mr-1" /> Populaire
                </Badge>
              )}
              <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
              <div className="mb-6">
                {plan.price === "Sur devis" ? (
                  <p className="text-2xl font-bold text-foreground">{plan.price}</p>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">EUR / mois</span>
                  </div>
                )}
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => navigate("/pro/create")}
                data-testid={`button-plan-${plan.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                {plan.cta} {plan.popular && <ArrowRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          ))}
        </div>
      </section>
      {/* RESTAURANTS */}
      <section ref={restaurantsRef} className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3" data-testid="text-restaurants-title">
              Nos restaurants partenaires
            </h2>
            <p className="text-muted-foreground text-lg">
              Commandez en ligne auprès de nos restaurants
            </p>
          </div>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des restaurants...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Aucun restaurant disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {restaurants.map((restaurant) => (
                <Card
                  key={restaurant.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
                  onClick={() => navigate(`/${restaurant.slug}`)}
                  data-testid={`card-restaurant-${restaurant.slug}`}
                >
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {restaurant.heroImageUrl ? (
                      <img src={restaurant.heroImageUrl} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : restaurant.logoUrl ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <img src={restaurant.logoUrl} alt={restaurant.name} className="max-h-24 max-w-24 object-contain" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <ChefHat className="h-16 w-16 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant={restaurant.isOpen ? "default" : "secondary"}
                        className={restaurant.isOpen ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                        data-testid={`badge-status-${restaurant.slug}`}
                      >
                        {restaurant.isOpen ? "Ouvert" : "Fermé"}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={`text-name-${restaurant.slug}`}>
                      {restaurant.name}
                    </h3>
                    {restaurant.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{restaurant.address}</span>
                      </div>
                    )}
                    {restaurant.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{restaurant.phone}</span>
                      </div>
                    )}
                    {(restaurant.openTime || restaurant.closeTime) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{restaurant.openTime || "?"} - {restaurant.closeTime || "?"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-faq-title">
            {lc?.faq?.title || "Questions fréquentes"}
          </h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-3">
          {(lc?.faq?.items || [
            { id: "commission", q: "Est-ce que c'est vraiment sans commission ?", a: "Oui, 0% de commission sur toutes vos commandes. Vous payez uniquement un abonnement mensuel fixe. Tout ce que vos clients paient vous revient intégralement." },
            { id: "mise-en-ligne", q: "Combien de temps pour mettre en ligne mon restaurant ?", a: "5 minutes. Vous créez votre compte, ajoutez vos catégories et plats, personnalisez vos couleurs — et votre site de commande est en ligne. Aucune compétence technique requise." },
            { id: "caisse", q: "Est-ce compatible avec ma caisse ?", a: "Très probablement. Grâce à notre intégration HubRise, nous sommes compatibles avec plus de 40 systèmes de caisse : LEO2, Zelty, Lightspeed, Tiller, iKentoo, et bien d'autres. Les commandes arrivent automatiquement dans votre caisse." },
            { id: "mybusiness", q: "Qu'est-ce que MyBusiness ?", a: "MyBusiness est notre suite de gestion financière intégrée. Elle inclut la gestion des achats fournisseurs, des frais généraux, le rapprochement bancaire automatique, la gestion des employés et de la paie, le scan de tickets par caméra, et l'import de bulletins de salaire PDF. C'est comme avoir un expert-comptable et un DRH intégrés dans votre espace restaurant." },
            { id: "maxai", q: "Qu'est-ce que MaxAI ?", a: "MaxAI est votre assistant intelligent propulsé par COBA. Il analyse vos données financières (achats, frais, CA, trésorerie) et répond à vos questions en langage naturel." },
            { id: "domaine", q: "Puis-je garder mon nom de domaine ?", a: "Oui, avec le plan Website + App, vous pouvez utiliser votre propre nom de domaine (ex: commander.monrestaurant.fr). Nous gérons la configuration technique pour vous." },
            { id: "engagement", q: "Y a-t-il un engagement ?", a: "Non, aucun engagement. Vous pouvez arrêter votre abonnement à tout moment." },
            { id: "securite", q: "Mes données sont-elles sécurisées ?", a: "Absolument. Nous utilisons le chiffrement SSL, les mots de passe sont hashés avec bcrypt, toutes les entrées sont validées et sanitisées, et notre infrastructure est surveillée 24/7 par 19 checks automatiques. Vos données financières MyBusiness sont isolées par restaurant." },
          ]).map((item: any) => (
            <FAQItem key={item.id} id={item.id} q={item.q} a={item.a} />
          ))}
        </div>
      </section>
      {/* FINAL CTA */}
      <section className="bg-gradient-to-r from-primary to-orange-600 text-white">
        <div className="container mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-cta-title">
            {lc?.cta?.title || "Prêt à reprendre le contrôle de vos commandes ?"}
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            {lc?.cta?.subtitle || "Rejoignez les restaurateurs qui ont choisi l'indépendance. 0% commission, mise en ligne en 5 minutes."}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/pro/create")}
              data-testid="button-final-cta"
            >
              {lc?.cta?.buttonPrimary || "Démarrer gratuitement"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/pro")}
              data-testid="button-final-pro"
            >
              {lc?.cta?.buttonSecondary || "Se connecter"}
            </Button>
          </div>
        </div>
      </section>
      {/* FOOTER */}
      <footer className="bg-card border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">macommande.shop</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lc?.footer?.description || "La plateforme tout-en-un pour les restaurants indépendants. Commande en ligne, gestion financière et RH — sans commission."}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors" data-testid="footer-features">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors" data-testid="footer-pricing">Tarifs</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors" data-testid="footer-faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Restaurateurs</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/pro/create")} className="hover:text-foreground transition-colors" data-testid="footer-create">Créer mon restaurant</button></li>
                <li><button onClick={() => navigate("/pro")} className="hover:text-foreground transition-colors" data-testid="footer-pro">Espace Pro</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span>{lc?.footer?.contactEmail || "contact@macommande.shop"}</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {lc?.footer?.copyright || "macommande.shop — Tous droits réservés"}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const shouldRedirect = isAdminDomain();

  useEffect(() => {
    if (shouldRedirect) {
      navigate("/123admin", { replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <LandingPage />;
}
