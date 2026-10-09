import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { cn } from "../../utils/cn.js";
import { Container } from "../ui/Layout.jsx";
import { Logo } from "./Logo.jsx";

export const PUBLIC_NAV = [
  { to: "/projetos", label: "Projetos" },
  { to: "/servicos", label: "Serviços" },
  { to: "/estudio", label: "Estúdio" },
  { to: "/briefing", label: "Briefing" },
];

function navClasses({ isActive }) {
  return cn(
    "relative py-2 text-[0.9375rem] font-semibold tracking-[0.2em] uppercase transition-colors duration-200",
    "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-walnut after:transition-transform after:duration-300",
    isActive ? "text-bone after:scale-x-100" : "text-mute after:scale-x-0 hover:text-bone hover:after:scale-x-100",
  );
}

export function SiteHeader({ studioName }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Fecha o menu móvel ao navegar.
  useEffect(() => setOpen(false), [location.pathname]);

  // Esc fecha o menu.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/92 backdrop-blur-md supports-[backdrop-filter]:bg-ink/80">
      <Container className="flex h-20 items-center justify-between">
        <Link to="/" className="rounded-sm" aria-label={`${studioName} — página inicial`}>
          <Logo name={studioName} />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-10">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navClasses} prefetch="intent">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="-mr-2 rounded-sm p-2 text-bone md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </Container>

      <nav
        id="mobile-nav"
        aria-label="Principal (celular)"
        hidden={!open}
        className="border-t border-line bg-ink md:hidden"
      >
        <Container as="ul" className="flex flex-col py-4">
          {PUBLIC_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between border-b border-line/70 py-4 text-[1.0625rem] font-semibold tracking-[0.2em] uppercase",
                    isActive ? "text-caramel" : "text-bone",
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </Container>
      </nav>
    </header>
  );
}
