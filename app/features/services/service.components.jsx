import {
  Bath,
  Briefcase,
  Compass,
  Flame,
  Hammer,
  Lamp,
  Layers,
  Ruler,
  Shirt,
  Sofa,
  Sparkles,
  Utensils,
} from "lucide-react";
import { cn } from "../../utils/cn.js";

export const SERVICE_ICON_COMPONENTS = {
  ruler: Ruler,
  compass: Compass,
  utensils: Utensils,
  shirt: Shirt,
  layers: Layers,
  hammer: Hammer,
  sofa: Sofa,
  lamp: Lamp,
  bath: Bath,
  briefcase: Briefcase,
  flame: Flame,
  sparkles: Sparkles,
};

export function ServiceIcon({ name, className }) {
  const Icon = SERVICE_ICON_COMPONENTS[name] ?? Hammer;
  return <Icon className={cn("size-6 text-caramel", className)} strokeWidth={1.4} aria-hidden="true" />;
}

/** Lista numerada (home): 01 — título — resumo. */
export function ServiceIndex({ services }) {
  return (
    <ol className="border-t border-line">
      {services.map((service, index) => (
        <li key={service.id} className="group grid grid-cols-[3rem_1fr] gap-x-6 border-b border-line py-7 sm:grid-cols-[4rem_2.5rem_1fr_1.4fr] sm:items-baseline">
          <span className="tabular text-[1.0625rem] text-faint">{String(index + 1).padStart(2, "0")}</span>
          <ServiceIcon name={service.icon} className="hidden translate-y-1 sm:block" />
          <h3 className="text-[1.625rem] leading-tight text-bone transition-colors group-hover:text-caramel">{service.title}</h3>
          <p className="col-start-2 mt-2 text-[1.0625rem] text-mute sm:col-start-auto sm:mt-0">{service.summary}</p>
        </li>
      ))}
    </ol>
  );
}

/** Bloco detalhado (página de serviços). */
export function ServiceDetail({ service, index }) {
  return (
    <article id={service.slug} className="grid scroll-mt-28 gap-8 border-t border-line py-14 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="tabular text-[1.0625rem] text-faint">{String(index + 1).padStart(2, "0")}</p>
        <div className="mt-4 flex items-center gap-4">
          <ServiceIcon name={service.icon} className="size-7" />
          <h2 className="text-[2rem] leading-tight text-bone sm:text-[2.375rem]">{service.title}</h2>
        </div>
        {service.summary && <p className="mt-4 max-w-md text-[1.1875rem] leading-relaxed text-mute">{service.summary}</p>}
      </div>
      <div>
        {service.description && <p className="text-[1.125rem] leading-relaxed text-mute">{service.description}</p>}
        {service.features?.length > 0 && (
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {service.features.map((feature) => (
              <li key={feature} className="flex gap-3 text-bone">
                <span className="mt-[0.8em] h-px w-4 shrink-0 bg-walnut" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
