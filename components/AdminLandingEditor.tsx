import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Save, RotateCcw, Plus, Trash2, Loader2, Eye,
  Zap, Type, MessageSquare, CreditCard, HelpCircle,
  Megaphone, LayoutGrid, ChevronDown, ChevronUp, GripVertical
} from "lucide-react";

interface LandingContent {
  hero: {
    badge: string;
    title1: string;
    titleHighlight: string;
    title2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    check1: string;
    check2: string;
    check3: string;
  };
  problem: {
    title: string;
    subtitle: string;
    marketplaceTitle: string;
    marketplaceItems: string[];
    marketplaceResult: string;
    usTitle: string;
    usItems: string[];
    usResult: string;
  };
  features: {
    badge: string;
    title: string;
    subtitle: string;
    clientPortal: { label: string; title: string; description: string; checks: string[] };
    proDashboard: { label: string; title: string; description: string; checks: string[] };
    myBusiness: { label: string; title: string; description: string; modules: string[] };
    pos: { label: string; title: string; description: string; checks: string[] };
    maxai: { label: string; title: string; description: string; modules: string[]; checks: string[] };
  };
  stats: { value: string; label: string }[];
  pricing: {
    title: string;
    subtitle: string;
    plans: { name: string; price: string; desc: string; features: string[]; cta: string; popular: boolean }[];
  };
  faq: {
    title: string;
    items: { id: string; q: string; a: string }[];
  };
  cta: {
    title: string;
    subtitle: string;
    buttonPrimary: string;
    buttonSecondary: string;
  };
  footer: {
    description: string;
    contactEmail: string;
    copyright: string;
  };
}

function SectionCard({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && <CardContent className="space-y-4 pt-0">{children}</CardContent>}
    </Card>
  );
}

function EditableList({ items, onChange, label }: {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={item}
            onChange={(e) => {
              const updated = [...items];
              updated[idx] = e.target.value;
              onChange(updated);
            }}
            className="text-sm"
            data-testid={`input-list-${label}-${idx}`}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="flex-shrink-0"
            data-testid={`button-remove-${label}-${idx}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange([...items, ""])}
        className="text-xs"
        data-testid={`button-add-${label}`}
      >
        <Plus className="w-3 h-3 mr-1" /> Ajouter
      </Button>
    </div>
  );
}

export default function AdminLandingEditor() {
  const { toast } = useToast();
  const [content, setContent] = useState<LandingContent | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: serverContent, isLoading } = useQuery<LandingContent>({
    queryKey: ["/api/landing-content"],
  });

  useEffect(() => {
    if (serverContent && !content) {
      setContent(serverContent);
    }
  }, [serverContent, content]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/landing-content", content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-content"] });
      setHasChanges(false);
      toast({ title: "Sauvegardé", description: "Le contenu de la landing page a été mis à jour." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    },
  });

  const update = (path: string, value: any) => {
    if (!content) return;
    const keys = path.split(".");
    const updated = JSON.parse(JSON.stringify(content));
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setContent(updated);
    setHasChanges(true);
  };

  const resetContent = () => {
    if (serverContent) {
      setContent(JSON.parse(JSON.stringify(serverContent)));
      setHasChanges(false);
    }
  };

  if (isLoading || !content) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background py-3 border-b mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold" data-testid="text-landing-editor-title">Éditeur Landing Page</h2>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">Modifications non sauvegardées</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/", "_blank")}
            data-testid="button-preview-landing"
          >
            <Eye className="w-4 h-4 mr-1" /> Aperçu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetContent}
            disabled={!hasChanges}
            data-testid="button-reset-landing"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            data-testid="button-save-landing"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      <SectionCard title="Hero — Bannière principale" icon={Zap} defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Badge</Label>
            <Input value={content.hero.badge} onChange={(e) => update("hero.badge", e.target.value)} data-testid="input-hero-badge" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Titre (partie 1)</Label>
              <Input value={content.hero.title1} onChange={(e) => update("hero.title1", e.target.value)} data-testid="input-hero-title1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Titre (surligné)</Label>
              <Input value={content.hero.titleHighlight} onChange={(e) => update("hero.titleHighlight", e.target.value)} data-testid="input-hero-highlight" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Titre (partie 2)</Label>
              <Input value={content.hero.title2} onChange={(e) => update("hero.title2", e.target.value)} data-testid="input-hero-title2" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sous-titre</Label>
            <Textarea value={content.hero.subtitle} onChange={(e) => update("hero.subtitle", e.target.value)} rows={3} data-testid="input-hero-subtitle" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Bouton principal</Label>
              <Input value={content.hero.ctaPrimary} onChange={(e) => update("hero.ctaPrimary", e.target.value)} data-testid="input-hero-cta1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bouton secondaire</Label>
              <Input value={content.hero.ctaSecondary} onChange={(e) => update("hero.ctaSecondary", e.target.value)} data-testid="input-hero-cta2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Check 1</Label>
              <Input value={content.hero.check1} onChange={(e) => update("hero.check1", e.target.value)} data-testid="input-hero-check1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Check 2</Label>
              <Input value={content.hero.check2} onChange={(e) => update("hero.check2", e.target.value)} data-testid="input-hero-check2" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Check 3</Label>
              <Input value={content.hero.check3} onChange={(e) => update("hero.check3", e.target.value)} data-testid="input-hero-check3" />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Comparatif — 0% commissions" icon={LayoutGrid}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre section</Label>
            <Input value={content.problem.title} onChange={(e) => update("problem.title", e.target.value)} data-testid="input-problem-title" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sous-titre</Label>
            <Textarea value={content.problem.subtitle} onChange={(e) => update("problem.subtitle", e.target.value)} rows={2} data-testid="input-problem-subtitle" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <div>
                <Label className="text-xs text-red-600">Titre colonne gauche</Label>
                <Input value={content.problem.marketplaceTitle} onChange={(e) => update("problem.marketplaceTitle", e.target.value)} />
              </div>
              <EditableList items={content.problem.marketplaceItems} onChange={(v) => update("problem.marketplaceItems", v)} label="marketplace-items" />
              <div>
                <Label className="text-xs text-red-600">Résultat</Label>
                <Input value={content.problem.marketplaceResult} onChange={(e) => update("problem.marketplaceResult", e.target.value)} />
              </div>
            </div>
            <div className="space-y-3 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <div>
                <Label className="text-xs text-green-600">Titre colonne droite</Label>
                <Input value={content.problem.usTitle} onChange={(e) => update("problem.usTitle", e.target.value)} />
              </div>
              <EditableList items={content.problem.usItems} onChange={(v) => update("problem.usItems", v)} label="us-items" />
              <div>
                <Label className="text-xs text-green-600">Résultat</Label>
                <Input value={content.problem.usResult} onChange={(e) => update("problem.usResult", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Fonctionnalités" icon={Type}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Badge</Label>
              <Input value={content.features.badge} onChange={(e) => update("features.badge", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Titre</Label>
              <Input value={content.features.title} onChange={(e) => update("features.title", e.target.value)} data-testid="input-features-title" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sous-titre</Label>
            <Textarea value={content.features.subtitle} onChange={(e) => update("features.subtitle", e.target.value)} rows={2} />
          </div>

          {(["clientPortal", "proDashboard", "pos"] as const).map(key => (
            <Card key={key} className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{content.features[key].label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs text-muted-foreground">Label</Label><Input value={content.features[key].label} onChange={(e) => update(`features.${key}.label`, e.target.value)} /></div>
                  <div><Label className="text-xs text-muted-foreground">Titre</Label><Input value={content.features[key].title} onChange={(e) => update(`features.${key}.title`, e.target.value)} /></div>
                </div>
                <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={content.features[key].description} onChange={(e) => update(`features.${key}.description`, e.target.value)} rows={2} /></div>
                <EditableList items={content.features[key].checks} onChange={(v) => update(`features.${key}.checks`, v)} label={`${key}-checks`} />
              </CardContent>
            </Card>
          ))}

          {(["myBusiness", "maxai"] as const).map(key => (
            <Card key={key} className="bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{content.features[key].label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs text-muted-foreground">Label</Label><Input value={content.features[key].label} onChange={(e) => update(`features.${key}.label`, e.target.value)} /></div>
                  <div><Label className="text-xs text-muted-foreground">Titre</Label><Input value={content.features[key].title} onChange={(e) => update(`features.${key}.title`, e.target.value)} /></div>
                </div>
                <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={content.features[key].description} onChange={(e) => update(`features.${key}.description`, e.target.value)} rows={2} /></div>
                <EditableList items={content.features[key].modules} onChange={(v) => update(`features.${key}.modules`, v)} label={`${key}-modules`} />
                {key === "maxai" && (
                  <EditableList items={content.features.maxai.checks} onChange={(v) => update("features.maxai.checks", v)} label="maxai-checks" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Statistiques (barre)" icon={LayoutGrid}>
        <div className="space-y-2">
          {content.stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={stat.value}
                onChange={(e) => {
                  const updated = [...content.stats];
                  updated[idx] = { ...updated[idx], value: e.target.value };
                  update("stats", updated);
                }}
                className="w-24"
                placeholder="Valeur"
              />
              <Input
                value={stat.label}
                onChange={(e) => {
                  const updated = [...content.stats];
                  updated[idx] = { ...updated[idx], label: e.target.value };
                  update("stats", updated);
                }}
                className="flex-1"
                placeholder="Label"
              />
              <Button size="icon" variant="ghost" onClick={() => update("stats", content.stats.filter((_, i) => i !== idx))}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => update("stats", [...content.stats, { value: "", label: "" }])}>
            <Plus className="w-3 h-3 mr-1" /> Ajouter
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Tarifs" icon={CreditCard}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input value={content.pricing.title} onChange={(e) => update("pricing.title", e.target.value)} data-testid="input-pricing-title" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sous-titre</Label>
            <Textarea value={content.pricing.subtitle} onChange={(e) => update("pricing.subtitle", e.target.value)} rows={2} />
          </div>
          {content.pricing.plans.map((plan, idx) => (
            <Card key={idx} className={`bg-muted/20 ${plan.popular ? "border-primary" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{plan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Populaire</Label>
                    <Switch
                      checked={plan.popular}
                      onCheckedChange={(v) => {
                        const updated = [...content.pricing.plans];
                        updated[idx] = { ...updated[idx], popular: v };
                        update("pricing.plans", updated);
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs text-muted-foreground">Nom</Label><Input value={plan.name} onChange={(e) => { const u = [...content.pricing.plans]; u[idx] = { ...u[idx], name: e.target.value }; update("pricing.plans", u); }} /></div>
                  <div><Label className="text-xs text-muted-foreground">Prix</Label><Input value={plan.price} onChange={(e) => { const u = [...content.pricing.plans]; u[idx] = { ...u[idx], price: e.target.value }; update("pricing.plans", u); }} /></div>
                  <div><Label className="text-xs text-muted-foreground">Bouton</Label><Input value={plan.cta} onChange={(e) => { const u = [...content.pricing.plans]; u[idx] = { ...u[idx], cta: e.target.value }; update("pricing.plans", u); }} /></div>
                </div>
                <div><Label className="text-xs text-muted-foreground">Description</Label><Input value={plan.desc} onChange={(e) => { const u = [...content.pricing.plans]; u[idx] = { ...u[idx], desc: e.target.value }; update("pricing.plans", u); }} /></div>
                <EditableList
                  items={plan.features}
                  onChange={(v) => { const u = [...content.pricing.plans]; u[idx] = { ...u[idx], features: v }; update("pricing.plans", u); }}
                  label={`plan-${idx}-features`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="FAQ" icon={HelpCircle}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre section</Label>
            <Input value={content.faq.title} onChange={(e) => update("faq.title", e.target.value)} data-testid="input-faq-title" />
          </div>
          {content.faq.items.map((item, idx) => (
            <Card key={idx} className="bg-muted/20">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Question</Label>
                      <Input
                        value={item.q}
                        onChange={(e) => {
                          const u = [...content.faq.items];
                          u[idx] = { ...u[idx], q: e.target.value };
                          update("faq.items", u);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Réponse</Label>
                      <Textarea
                        value={item.a}
                        onChange={(e) => {
                          const u = [...content.faq.items];
                          u[idx] = { ...u[idx], a: e.target.value };
                          update("faq.items", u);
                        }}
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => update("faq.items", content.faq.items.filter((_, i) => i !== idx))}
                    className="mt-5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => update("faq.items", [...content.faq.items, { id: `faq-${Date.now()}`, q: "", a: "" }])}
            data-testid="button-add-faq"
          >
            <Plus className="w-3 h-3 mr-1" /> Ajouter une question
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Appel à l'action final (CTA)" icon={Megaphone}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input value={content.cta.title} onChange={(e) => update("cta.title", e.target.value)} data-testid="input-cta-title" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sous-titre</Label>
            <Textarea value={content.cta.subtitle} onChange={(e) => update("cta.subtitle", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Bouton principal</Label>
              <Input value={content.cta.buttonPrimary} onChange={(e) => update("cta.buttonPrimary", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bouton secondaire</Label>
              <Input value={content.cta.buttonSecondary} onChange={(e) => update("cta.buttonSecondary", e.target.value)} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pied de page" icon={MessageSquare}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={content.footer.description} onChange={(e) => update("footer.description", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email de contact</Label>
              <Input value={content.footer.contactEmail} onChange={(e) => update("footer.contactEmail", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Copyright</Label>
              <Input value={content.footer.copyright} onChange={(e) => update("footer.copyright", e.target.value)} />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
