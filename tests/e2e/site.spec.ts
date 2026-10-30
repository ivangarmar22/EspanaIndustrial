import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoSeriousA11yViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .exclude(".maplibregl-canvas-container")
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(" | ")}`,
    ),
  ).toEqual([]);
}

test("home presents real figures and accessible structure", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("industrialización");
  await expect(page.getByText("elementos documentados").first()).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("catalogue search and filters are shareable URLs that work", async ({ page }) => {
  await page.goto("/catalogo?q=riotinto");
  await expect(page.getByRole("link", { name: /Riotinto/ }).first()).toBeVisible();
  await page.goto("/catalogo?categoria=energia&tipo=hidroelectrica");
  const heading = page.locator("#resultados");
  await expect(heading).toContainText(/\d+ elementos?/);
  await expect(page.getByRole("link", { name: /quitar filtro/i }).first()).toBeVisible();
  await page.goto("/catalogo?q=zzzzzz-no-existe");
  await expect(page.getByText("Ningún elemento cumple estos filtros")).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("record page shows provenance per field and a working map link", async ({ page }) => {
  await page.goto("/patrimonio/real-fabrica-de-artilleria-de-sevilla");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Real Fábrica de Artillería de Sevilla");
  await expect(page.getByRole("heading", { name: "Fuentes de esta ficha" })).toBeVisible();
  await expect(page.locator("#fuente-ipce-ficha")).toContainText("Ministerio de Cultura");
  await expect(page.getByText("Las fuentes no coinciden en algún dato")).toBeVisible();
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((j) => j.includes("LandmarksOrHistoricalBuildings"))).toBe(true);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardado" })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("old or unknown slugs do not break the site", async ({ page }) => {
  const res = await page.goto("/patrimonio/no-existe-este-elemento");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Este lugar no figura en el atlas")).toBeVisible();
});

test("map loads tiles, filters update results and selection opens a summary", async ({ page, isMobile }) => {
  await page.goto("/mapa?categoria=mineria");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 20_000 });
  if (isMobile) await page.getByRole("button", { name: /Buscar y filtrar/ }).click();
  await page.getByRole("combobox", { name: "Buscar en el mapa" }).fill("Almadén");
  await page.getByRole("option", { name: /Paisaje minero de Almadén/ }).click();
  await expect(page.getByRole("link", { name: "Abrir la ficha" })).toBeVisible();
  expect(page.url()).toContain("categoria=mineria");
  expect(page.url()).toContain("sel=");
});

test("contribution form validates and explains errors", async ({ page }) => {
  await page.goto("/colabora");
  await page.waitForTimeout(4500); // anti-bot minimum fill time
  await page.getByRole("button", { name: "Enviar propuesta" }).click();
  await expect(page.getByText("Revisa los campos marcados.")).toBeVisible();
  await expect(page.getByText("Elige el elemento al que se refiere la propuesta.")).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("mobile menu opens, traps nothing and closes with Escape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("navigation", { name: "Principal (móvil)" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Principal (móvil)" })).toBeHidden();
});

test("railway section maps closed stations, filters by greenway and links line pages", async ({ page, isMobile }) => {
  await page.goto("/ferrocarril");
  await expect(page.getByRole("heading", { level: 1, name: "Estaciones cerradas y antiguos trazados" })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 20_000 });
  if (isMobile) await page.getByRole("button", { name: /Filtros y capas/ }).click();
  const total = await page.getByRole("status").filter({ hasText: "estaciones" }).first().innerText();
  await page
    .getByRole("switch", { name: /Vía Verde a menos/ })
    .first()
    .check();
  await expect(page.getByRole("status").filter({ hasText: "estaciones" }).first()).not.toHaveText(total);
  expect(page.url()).toContain("viaverde=1");
  if (isMobile) await page.getByRole("button", { name: "Cerrar filtros" }).click();
  await page.getByRole("link", { name: "Ferrocarril Vasco-Navarro" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Ferrocarril Vasco-Navarro" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});
