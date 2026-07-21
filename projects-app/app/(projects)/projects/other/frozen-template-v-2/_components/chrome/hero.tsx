import type { Passport } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import Badges from "./badges";

// ГЕРОЙ — центрированный блок: бейджи над именем, имя по центру, описание ниже. Всё из паспорта ядра.
// Одинаков по форме на обеих поверхностях; отличается только набор бейджей (решает <Badges/> по surface).
export default function Hero({ passport, surface }: { passport: Passport; surface: Surface }) {
  return (
    <section data-chrome="hero" className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex flex-wrap items-center justify-center gap-2">
        <Badges passport={passport} surface={surface} />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">{passport.title}</h1>
      {passport.description ? (
        <p className="max-w-2xl text-balance text-sm text-muted-foreground">{passport.description}</p>
      ) : null}
    </section>
  );
}
