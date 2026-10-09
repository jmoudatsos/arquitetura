import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../../components/ui/Button.jsx";
import { TextField } from "../../../components/ui/Field.jsx";
import { ChevronSteps } from "../../../components/ui/Stepper.jsx";
import { cn } from "../../../utils/cn.js";
import { maskPhoneInput } from "../../../utils/phone.js";
import { ROOMS } from "../briefing.options.js";
import { ROOM_ICONS } from "./room-icons.js";

// No celular "Preferências" não cabe na seta: usa o rótulo curto.
const JOURNEY = [{ title: "Espaço" }, { title: "Preferências", shortTitle: "Estilo" }, { title: "Detalhes" }];

/**
 * Card "Iniciar seu projeto" do hero (mockup).
 * Coleta o início do briefing e segue para /briefing com os dados preenchidos.
 * Nome e WhatsApp viajam no estado da navegação — nunca na URL.
 */
export function QuickStartCard({ className }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  function toggle(id) {
    setRooms((current) => (current.includes(id) ? current.filter((room) => room !== id) : [...current, id]));
  }

  function start(event) {
    event?.preventDefault();
    navigate("/briefing", {
      state: { briefingPrefill: { ambientesSelecionados: rooms, nome, whatsapp } },
    });
  }

  return (
    <form
      onSubmit={start}
      action="/briefing"
      method="get"
      className={cn("rounded-sm border border-line bg-panel p-5 sm:p-8", className)}
      aria-labelledby="quickstart-title"
    >
      <h2 id="quickstart-title" className="text-center text-[1.25rem] font-medium tracking-[0.14em] text-bone uppercase sm:text-[1.375rem] sm:tracking-[0.2em]">
        Iniciar seu projeto
      </h2>

      <ChevronSteps steps={JOURNEY} current={1} className="mt-6" />

      <fieldset className="mt-7">
        <legend className="label-caps mb-3 text-mute">Quais ambientes?</legend>
        <div className="grid grid-cols-3 gap-2">
          {ROOMS.map((room) => {
            const Icon = ROOM_ICONS[room.id];
            const selected = rooms.includes(room.id);
            return (
              <button
                key={room.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(room.id)}
                className={cn(
                  "flex aspect-[1/0.92] flex-col items-center justify-center gap-2 rounded-sm border px-1 text-center transition-colors duration-150",
                  selected ? "border-walnut bg-walnut/12 text-caramel" : "border-line bg-ink text-mute hover:border-field hover:text-bone",
                )}
              >
                <Icon className="size-7" strokeWidth={1.3} aria-hidden="true" />
                <span className="text-[0.8125rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:tracking-[0.14em]">
                  {room.shortTitle}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 space-y-4">
        <TextField
          label="Seu nome"
          autoComplete="name"
          placeholder="Como podemos te chamar?"
          value={nome}
          maxLength={120}
          onChange={(event) => setNome(event.target.value)}
        />
        <TextField
          label="WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(48) 99999-0000"
          value={whatsapp}
          onChange={(event) => setWhatsapp(maskPhoneInput(event.target.value))}
        />
      </div>

      <Button type="submit" size="lg" className="mt-7 w-full">
        Continuar briefing <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
      <p className="mt-3 text-center text-[0.9375rem] text-faint">Leva cerca de 3 minutos · sem compromisso</p>
    </form>
  );
}
