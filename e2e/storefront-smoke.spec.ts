import { expect, test } from "@playwright/test";

test.describe("Storefront smoke (Shopify-style paths)", () => {
  test("robots.txt references sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text.toLowerCase()).toContain("sitemap:");
    expect(text).toMatch(/sitemap\.xml/i);
  });

  test("sitemap.xml is valid urlset", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<url>");
    expect(xml).toContain("<loc>");
  });

  test("home renders main storefront", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#MainContent").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveTitle(/.+/);
  });

  test("collections index loads", async ({ page }) => {
    await page.goto("/collections");
    await expect(page.locator("#MainContent, main").first()).toBeVisible({ timeout: 30_000 });
  });

  test("/sale redirects to /collections/sale", async ({ page }) => {
    await page.goto("/sale", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/collections\/sale\/?$/);
  });

  test("contact page loads", async ({ page }) => {
    await page.goto("/contact");
    await expect(
      page.locator("#MainContent").getByRole("heading", { level: 1, name: "Need Help?" }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("policies index loads", async ({ page }) => {
    await page.goto("/policies");
    await expect(page.getByRole("heading", { name: /store policies/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("search page loads", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator("#MainContent, main").first()).toBeVisible({ timeout: 30_000 });
  });

  test("cart drawer: open via header and close", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#MainContent, main").first()).toBeVisible({ timeout: 30_000 });

    await page.locator("#site-header").getByRole("button", { name: /^Cart/i }).click();

    await expect(page.getByRole("heading", { name: /^Cart$/ })).toBeVisible();
    await page.getByRole("button", { name: "Close cart" }).click();
    await expect(page.getByRole("heading", { name: /^Cart$/ })).toBeHidden({ timeout: 10_000 });
  });

  test("PLP → PDP when product link exists", async ({ page }) => {
    await page.goto("/collections");
    await expect(page.locator("#MainContent, main").first()).toBeVisible({ timeout: 30_000 });

    const productLink = page.locator('main a[href^="/products/"]').first();
    const count = await productLink.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await productLink.click();
    await expect(page).toHaveURL(/\/products\/[^/]+$/);
    await expect(page.locator("#MainContent, main").first()).toBeVisible({ timeout: 30_000 });
  });

  test("add to cart from PLP when quick-add exists", async ({ page }) => {
    await page.goto("/collections");
    await expect(page.locator("#MainContent, main").first()).toBeVisible({ timeout: 30_000 });

    const addBtn = page.getByRole("button", { name: /^Add to cart$/i }).first();
    if ((await addBtn.count()) === 0) {
      test.skip();
      return;
    }

    await addBtn.click();
    await expect(page.getByRole("heading", { name: /^Cart$/ })).toBeVisible({ timeout: 15_000 });
    const heading = page.getByRole("heading", { name: /^Cart$/ });
    await expect(heading).toBeVisible();
    await page.getByRole("button", { name: "×" }).click();
  });
});
