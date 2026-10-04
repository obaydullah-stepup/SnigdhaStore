import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import { getTranslations } from "@/lib/i18n";

const KEYS = [
  { icon: Truck, titleKey: "why.delivery.title", textKey: "why.delivery.text" },
  { icon: RotateCcw, titleKey: "why.returns.title", textKey: "why.returns.text" },
  { icon: ShieldCheck, titleKey: "why.cod.title", textKey: "why.cod.text" },
  { icon: Headphones, titleKey: "why.support.title", textKey: "why.support.text" },
] as const;

export async function WhyChoose() {
  const { t } = await getTranslations();

  return (
    <section className="border-border bg-background border-y">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {KEYS.map((item) => (
          <div key={item.titleKey} className="flex items-start gap-4">
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
              <item.icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-foreground font-medium">{t(item.titleKey)}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{t(item.textKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}