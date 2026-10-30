import { describe, expect, it } from "vitest";
import { classify } from "@/pipeline/classify";
import {
  joinLayoutHyphens,
  looksLikeAddress,
  nameFromPlaceText,
  restoreCase,
  stripLocationSuffix,
  tidyName,
  vocabularyOf,
} from "@/pipeline/naming";

describe("restoreCase", () => {
  it("learns proper nouns from running prose", () => {
    const prose = ["El Puente de Jánovas es el único puente colgante del siglo XIX sobre el río Ara."];
    expect(restoreCase("PUENTE COLGANTE DE JÁNOVAS SOBRE EL RÍO ARA", prose)).toBe(
      "Puente colgante de Jánovas sobre el río Ara",
    );
  });
  it("keeps codes with digits and acronyms written in capitals", () => {
    expect(
      restoreCase("AERONAVE CONVAIR CV-990 DE SPANTAX EC-BZO", [
        "La aeronave de Spantax, matrícula EC-BZO, voló hasta 1987.",
      ]),
    ).toBe("Aeronave convair CV-990 de Spantax EC-BZO");
  });
  it("leaves mixed-case names untouched", () => {
    expect(restoreCase("Fábrica Trepat", [])).toBe("Fábrica Trepat");
  });
});

describe("name cleaning", () => {
  it.each([
    ["Colonia Sedó. Esparraguera (Barcelona)", undefined, "Colonia Sedó"],
    ["Noria de Jinámar. Telde (Gran Canaria)", undefined, "Noria de Jinámar"],
    ["Fábrica de cervezas El Águila. Madrid", undefined, "Fábrica de cervezas El Águila"],
    ["Coto minero de Irugurutzeta, Irún, (Guipúzcoa)", "Irun", "Coto minero de Irugurutzeta"],
    [
      "Canal de Castilla (Burgos, Palencia y Valladolid)",
      undefined,
      "Canal de Castilla (Burgos, Palencia y Valladolid)",
    ],
  ])("strips location suffix from %j", (input, muni, expected) => {
    expect(stripLocationSuffix(input, muni)).toBe(expected);
  });

  it("joins layout hyphens only when the joined word is attested", () => {
    const vocab = vocabularyOf(["La colonización española de América."]);
    expect(joinLayoutHyphens("la coloniza-ción y el conjunto minero-metalúrgico", vocab)).toBe(
      "la colonización y el conjunto minero-metalúrgico",
    );
  });

  it("tidies stray spaces around hyphens", () => {
    expect(tidyName("Cuenca Minera de Riotinto- Nerva")).toBe("Cuenca Minera de Riotinto-Nerva");
  });

  it("detects addresses and separates name from address in map labels", () => {
    expect(looksLikeAddress("C/ Mercado 32, Zarza de Granadilla")).toBe(true);
    expect(looksLikeAddress("Fábrica Giner")).toBe(false);
    expect(nameFromPlaceText("Azucarera San Isidro e Ingenio desan Juan.Ctra. de Málaga 172, Granada")).toBe(
      "Azucarera San Isidro e Ingenio desan Juan",
    );
  });
});

describe("classify", () => {
  it("keeps the official uso as the family and refines the type by name", () => {
    expect(classify("Minería", ["Paisaje minero de Riotinto"])).toMatchObject({
      family: "mineria",
      sub: "paisaje-minero",
      rule: "keyword",
    });
    expect(classify("Energía", ["Salto y central hidroeléctrica de Grandas de Salime"])).toMatchObject({
      family: "energia",
      sub: "hidroelectrica",
    });
  });
  it("never lets a keyword override an incompatible uso", () => {
    // "Fábrica" uso cannot become mining even if the name mentions a mine.
    expect(classify("Fábrica", ["Fábrica de la mina"]).family).not.toBe("mineria");
  });
  it("places sugar, flour and beer under manufacturing as the spec requires", () => {
    expect(classify("Agroalimentario", ["Azucarera de San Juan"])).toMatchObject({
      family: "industria",
      sub: "azucarera",
    });
    expect(classify("Bodega", ["Fábrica de Cervezas El Águila"])).toMatchObject({
      family: "industria",
      sub: "cerveza",
    });
  });
  it("falls back explicitly when the uso is unknown", () => {
    expect(classify(undefined, ["Elemento de prueba"]).rule).toBe("fallback");
  });
});
