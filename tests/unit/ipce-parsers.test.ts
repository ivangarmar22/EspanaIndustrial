import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyProtection, parseFicha } from "@/pipeline/sources/ministerio-cultura/ficha";
import { LEGEND_FOLDER, parseKml, parsePlacemark, type McPoint } from "@/pipeline/sources/ministerio-cultura/kml";
import { groupPoints } from "@/pipeline/sources/ministerio-cultura";

const fixture = (f: string) => readFileSync(path.join(__dirname, "..", "fixtures", "ipce", f), "utf8");
const pages = (f: string) => fixture(f).split("\n\f\n");

describe("IPCE map KML", () => {
  const placemarks = parseKml(fixture("map-sample.kml"));
  const points = placemarks.filter((p) => p.folder !== LEGEND_FOLDER).map(parsePlacemark) as McPoint[];

  it("skips the legend and parses every real placemark", () => {
    expect(points).toHaveLength(5);
    expect(points.every((p) => !("error" in p))).toBe(true);
  });

  it("normalises irregular codes and sub-points", () => {
    const codes = points.map((p) => `${p.code}${p.part ? `/${p.part}` : ""}`).sort();
    expect(codes).toEqual(["AN-01", "CAT-05/A", "CAT-05/B", "CYL-18/A", "PV-07"]);
  });

  it("groups multi-site elements under one code", () => {
    expect(groupPoints(points).get("CAT-05")).toHaveLength(2);
  });

  it("splits different assets that reuse a code but link different fichas", () => {
    const base = points.find((p) => p.code === "AN-01")!;
    const a = { ...base, code: "CAT-07", driveFileId: "ficha-a" };
    const b = { ...base, code: "CAT-07", driveFileId: "ficha-b" };
    const groups = groupPoints([a, b]);
    expect([...groups.keys()]).toEqual(["CAT-07", "CAT-07/2"]);
  });

  it("extracts activity, chronology, ficha link and uso", () => {
    const an01 = points.find((p) => p.code === "AN-01")!;
    expect(an01.activity).toBe("Fábrica de Armas");
    expect(an01.chronologyLabel).toBe("1720-1916");
    expect(an01.driveFileId).toBe("1eDDWBIh2OReKiJLTbVB15Uiil4WJVBRA");
    expect(an01.uso).toBe("Fábrica");
  });
});

describe("IPCE ficha PDF text", () => {
  it("extracts labelled fields from a complete sheet", () => {
    const f = parseFicha(pages("ficha-an-01.txt"));
    expect(f.officialName).toBe("Real Fábrica de Artillería de Sevilla");
    expect(f.cadastralRef).toBe("6118001TG3461N");
    expect(f.point).toEqual({ lat: 37.384063, lon: -5.981863 });
    expect(f.protection).toMatchObject({
      level: "BIC",
      original: "BIC (Grado I)",
      datesAsPrinted: ["27/12/1994", "30/11/2001"],
    });
    expect(f.history).toMatch(/^La Fábrica de Bronces de Sevilla se funda en 1565/);
    expect(f.conservation).toMatch(/^Regular/);
  });

  it("never imports template placeholders such as surface areas", () => {
    expect(JSON.stringify(parseFicha(pages("ficha-an-01.txt")))).not.toContain("123.456.789");
  });

  it("discards values cut by the column layout instead of storing them truncated", () => {
    const f = parseFicha(pages("ficha-sa-04.txt"));
    expect(f.owner).toBeUndefined();
    expect(f.warnings.some((w) => w.startsWith("Propiedad"))).toBe(true);
  });

  it("rejects labels leaking into values on atypical layouts", () => {
    const f = parseFicha(pages("ficha-ar-19.txt"));
    expect(f.otherNames).toBeUndefined();
    expect(f.chronologyLabel).toBeUndefined();
  });

  it.each([
    ["BIC (Grado I)", "BIC"],
    ["Bien cultural de interés local", "BRL"],
    ["Bien inventariado", "inventario"],
    ["No consta", undefined],
  ])("classifies protection %j", (text, level) => {
    expect(classifyProtection(text)).toBe(level);
  });
});
