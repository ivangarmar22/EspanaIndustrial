import { TriangleAlert } from "lucide-react";

/** Shown wherever closed stations or former alignments are mapped. */
export function SafetyNotice() {
  return (
    <aside className="self-start border-l-4 border-warning bg-card p-5" aria-labelledby="seguridad">
      <h2 id="seguridad" className="flex items-center gap-2 font-display text-2xl">
        <TriangleAlert className="size-6 text-warning" aria-hidden="true" /> Antes de ir
      </h2>
      <ul className="mt-3 grid list-disc gap-2 pl-5 text-[0.95rem] text-ink-soft">
        <li>
          Una estación cerrada puede estar junto a una línea <strong>con trenes en circulación</strong>. Caminar por las
          vías en servicio es peligroso y está prohibido.
        </li>
        <li>Las vías «sin servicio» conservan los carriles y pueden volver a usarse: no son caminos.</li>
        <li>
          Muchos edificios y trazados abandonados son <strong>propiedad privada</strong> o están en mal estado. No
          entres en construcciones cerradas.
        </li>
        <li>Túneles y puentes fuera de las Vías Verdes pueden no ser seguros.</li>
      </ul>
    </aside>
  );
}
