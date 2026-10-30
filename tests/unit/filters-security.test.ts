import { describe, expect, it } from "vitest";
import { filtersToParams, parseFilters } from "@/domain/filters-url";
import { applyFilters, matchesQuery, type IndexItem } from "@/domain/index-item";
import { normalizeText } from "@/lib/text";
import { HttpClient, InvalidResponseError, SourceUnavailableError } from "@/pipeline/http";
import { ContributionInput } from "@/domain/contribution";

const item = (over: Partial<IndexItem>): IndexItem => ({
  id: "ei-00001",
  slug: "elemento-de-prueba",
  name: "Elemento de prueba",
  family: "industria",
  sub: "textil",
  lat: 40,
  lon: -3,
  protection: [],
  validation: "partial",
  search: normalizeText("Elemento de prueba Fábrica Ávila"),
  ...over,
});

describe("filters", () => {
  it("round-trips through the URL", () => {
    const f = {
      q: "azúcar",
      family: "industria",
      sub: "azucarera",
      region: "01",
      from: 1850,
      to: 1899,
      protection: "BIC",
      withImage: true,
    } as const;
    expect(parseFilters(filtersToParams(f))).toEqual(f);
  });
  it("ignores invalid values instead of failing", () => {
    expect(parseFilters({ categoria: "inventada", desde: "abc", proteccion: "<script>" })).toEqual({});
  });
  it("searches without accents and case", () => {
    expect(matchesQuery(item({}), "fabrica avila")).toBe(true);
  });
  it("excludes undated items from date filters instead of assuming they match", () => {
    const dated = item({ id: "ei-00002", yearFrom: 1880, yearTo: 1950 });
    expect(applyFilters([item({}), dated], { from: 1900, to: 1910 }).map((i) => i.id)).toEqual(["ei-00002"]);
  });
});

describe("contribution form validation", () => {
  const base = {
    kind: "photo" as const,
    recordId: "ei-00001",
    description: "Fotografías actuales del castillete y de la casa de máquinas.",
    acceptLicense: true as const,
    acceptPrivacy: true as const,
  };
  it("asks for photo links, then for their author", () => {
    expect(ContributionInput.safeParse(base).error?.issues[0]?.path).toEqual(["photoLinks"]);
    const links = {
      ...base,
      photoLinks: ["https://drive.google.com/abc", "https://commons.wikimedia.org/wiki/File:X.jpg"].join(
        String.fromCharCode(10),
      ),
    };
    expect(ContributionInput.safeParse(links).error?.issues[0]?.path).toEqual(["photoAuthor"]);
    expect(ContributionInput.safeParse({ ...links, photoAuthor: "Ana" }).success).toBe(true);
  });
  it("rejects anything that is not a full link", () => {
    const r = ContributionInput.safeParse({ ...base, photoAuthor: "Ana", photoLinks: "mis fotos en drive" });
    expect(r.error?.issues[0]?.path).toEqual(["photoLinks"]);
  });
});

describe("HttpClient", () => {
  const noSleep = async () => {};
  it("retries server errors and then reports the source as unavailable", async () => {
    let calls = 0;
    const http = new HttpClient({
      retries: 2,
      sleep: noSleep,
      minIntervalMs: 0,
      fetchImpl: async () => (calls++, new Response("", { status: 503 })),
    });
    await expect(http.getText("https://example.test/a")).rejects.toBeInstanceOf(SourceUnavailableError);
    expect(calls).toBe(3);
  });
  it("rejects truncated or wrongly typed responses without retrying", async () => {
    const http = new HttpClient({
      sleep: noSleep,
      minIntervalMs: 0,
      fetchImpl: async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    });
    await expect(http.getText("https://example.test/b", { expectContentType: /xml/ })).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
    await expect(http.getText("https://example.test/c", { minBytes: 1000 })).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });
});
