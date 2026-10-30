import { describe, expect, it } from "vitest";
import { parseAdminUnits, toPlace } from "@/pipeline/sources/cartociudad";
import { normalizeLicense } from "@/pipeline/sources/commons";
import { decideMatch } from "@/pipeline/sources/wikidata";

describe("CartoCiudad", () => {
  it("maps the reverse geocoder response and validates codes", () => {
    const place = toPlace(
      { lat: 37.38, lon: -5.98 },
      {
        muni: "Sevilla",
        muniCode: "41091",
        provinceCode: "41",
        comunidadAutonomaCode: "01",
        refCatastral: "6118001TG3461N",
      },
      "2026-10-25T00:00:00Z",
    );
    expect(place).toMatchObject({ municipality: "Sevilla", ineCode: "41091", provinceCode: "41", regionCode: "01" });
  });

  it("parses the IGN administrative-units fallback (real response shape)", () => {
    const text = `nationalcode = 34012300000\nnameunit = Jaén\nthe_geom = [GEOMETRY]\nnationalcode = 34010000000\nnameunit = Andalucía\nnationalcode = 34012323011\nnameunit = Baños de la Encina\n`;
    expect(parseAdminUnits(text)).toEqual({
      municipality: "Baños de la Encina",
      ineCode: "23011",
      provinceCode: "23",
      regionCode: "01",
    });
  });
});

describe("Commons licences", () => {
  it.each([
    ["CC BY-SA 4.0", "CC BY-SA 4.0"],
    ["CC-BY-SA-3.0", "CC BY-SA 3.0"],
    ["CC0", "CC0"],
    ["Public domain", "Public domain"],
    ["GFDL", undefined],
    ["CC BY-NC 4.0", undefined],
  ])("normalises %j", (input, expected) => {
    expect(normalizeLicense(input)).toBe(expected);
  });
});

describe("Wikidata matching policy", () => {
  const names = ["Real Fábrica de Artillería de Sevilla"];
  it("accepts automatically only close and clearly similar items", () => {
    expect(
      decideMatch(names, [{ qid: "Q1", label: "Real Fábrica de Artillería de Sevilla", distanceM: 30 }]).decision,
    ).toBe("auto");
  });
  it("leaves distant or weakly similar items as candidates for review", () => {
    expect(decideMatch(names, [{ qid: "Q1", label: "Real Fábrica de Artillería", distanceM: 1500 }]).decision).toBe(
      "candidate",
    );
  });
  it("refuses to choose between two near-identical candidates", () => {
    const r = decideMatch(names, [
      { qid: "Q1", label: "Real Fábrica de Artillería de Sevilla", distanceM: 30 },
      { qid: "Q2", label: "Real Fábrica de Artillería de Sevilla", distanceM: 60 },
    ]);
    expect(r.decision).toBe("candidate");
  });
  it("returns none when nothing resembles the element", () => {
    expect(decideMatch(names, [{ qid: "Q9", label: "Iglesia de Santa Ana", distanceM: 100 }]).decision).toBe("none");
  });
});
