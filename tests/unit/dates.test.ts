import { describe, expect, it } from "vitest";
import { formatHistoricalDate, parseChronologyLabel, yearSpan } from "@/domain/dates";

describe("parseChronologyLabel", () => {
  it.each([
    ["1720-1916", { from: { kind: "year", year: 1720 }, to: { kind: "year", year: 1916 } }],
    ["1953-59", { from: { kind: "year", year: 1953 }, to: { kind: "year", year: 1959 } }],
    ["S. XVIII-XIX", { from: { kind: "century", century: 18 }, to: { kind: "century", century: 19 } }],
    ["mediados S.XIX-1989", { from: { kind: "century", century: 19, part: "mid" }, to: { kind: "year", year: 1989 } }],
    ["ca-1900", { from: { kind: "circa", year: 1900 } }],
    ["1846 y posteriores", { from: { kind: "year", year: 1846 } }],
    ["1912-1975 (Hoy: museo)", { from: { kind: "year", year: 1912 }, to: { kind: "year", year: 1975 } }],
  ])("parses %s", (label, expected) => {
    expect(parseChronologyLabel(label)).toEqual({ ...expected, label });
  });

  it("treats an open end as start only, without asserting current activity", () => {
    expect(parseChronologyLabel("1914-actual")).toEqual({ from: { kind: "year", year: 1914 }, label: "1914-actual" });
  });

  it.each(["187566", "18548-1980", "1949.1996", "4000AC-1987", "1990-1950", ""])(
    "refuses to guess ambiguous label %j",
    (label) => {
      expect(parseChronologyLabel(label)).toBeUndefined();
    },
  );
});

describe("formatting and spans", () => {
  it("never shows an approximate date as exact", () => {
    expect(formatHistoricalDate({ kind: "circa", year: 1900 })).toBe("h. 1900");
    expect(formatHistoricalDate({ kind: "century", century: 19, part: "late" })).toBe("finales del s. XIX");
  });
  it("computes inclusive spans", () => {
    expect(yearSpan({ kind: "century", century: 19 })).toEqual([1801, 1900]);
    expect(yearSpan({ kind: "circa", year: 1900 })).toEqual([1895, 1905]);
  });
});
