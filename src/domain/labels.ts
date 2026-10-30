import type { ConservationRating, PhysicalState, ProtectionLevel, SourceTier, ValidationLevel } from "./schema";

export const PROTECTION_LABELS: Record<ProtectionLevel, string> = {
  BIC: "Bien de Interés Cultural",
  BRL: "Bien de relevancia o interés local",
  BIP: "Bien de Interés Patrimonial",
  inventario: "Bien inventariado",
  planeamiento: "Protección urbanística",
  unesco: "Patrimonio Mundial",
  other: "Otra protección",
};

export const PROTECTION_SHORT: Record<ProtectionLevel, string> = {
  BIC: "BIC",
  BRL: "Interés local",
  BIP: "BIP",
  inventario: "Inventariado",
  planeamiento: "Urbanística",
  unesco: "UNESCO",
  other: "Otra",
};

export const CONSERVATION_LABELS: Record<ConservationRating, string> = {
  good: "Bueno",
  fair: "Regular",
  poor: "Malo o deficiente",
  "very-poor": "Ruina",
};

export const PHYSICAL_STATE_LABELS: Record<PhysicalState, string> = {
  conserved: "Conservado",
  "partially-conserved": "Parcialmente conservado",
  ruins: "En ruinas",
  disappeared: "Desaparecido",
};

export const VALIDATION_LABELS: Record<ValidationLevel, { label: string; description: string }> = {
  "primary-verified": {
    label: "Verificado",
    description: "Los datos principales se han comprobado editorialmente contra la fuente primaria.",
  },
  "cross-checked": {
    label: "Contrastado",
    description:
      "La ficha del IPCE y una fuente oficial independiente (CartoCiudad/Catastro) coinciden en la localización.",
  },
  partial: {
    label: "Documentación parcial",
    description: "Procede de la ficha del IPCE mediante extracción automática; falta revisión editorial.",
  },
  secondary: {
    label: "Fuentes secundarias",
    description: "Solo se dispone de fuentes colaborativas o secundarias.",
  },
  pending: {
    label: "Pendiente de revisión",
    description: "Solo se dispone de los datos del mapa del IPCE, sin ficha documental extraída.",
  },
};

export const SOURCE_TIER_LABELS: Record<SourceTier, string> = {
  primary: "Fuente primaria oficial",
  "official-secondary": "Fuente oficial complementaria",
  collaborative: "Fuente colaborativa",
  editorial: "Revisión editorial",
};
