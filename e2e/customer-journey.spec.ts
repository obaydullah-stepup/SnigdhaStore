import { test, expect } from "@playwright/test";

test("storefront golden path: register → login → browse → cart → wishlist → search → coupon → checkout → order", async ({ page }) => {
  test.setTimeout(120_000);

  const email = `e2e.${Date.now()}@example.com`;
  const password = "Str0ngPass!23";
  const name = "E2E Shopper";
  const phone = "01712345678";

  // 1. Register (auto-logs in), then sign out and sign back in — proves both auth paths.
  await page.goto("/register");
  await page.getByLabel(/full name/i).fill(name);
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/phone/i).fill(phone);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("/");

  await page.goto("/account");
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL("/");

  await page.goto("/login");
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "Account", exact: true })).toBeVisible();

  // 2. Browse /shop, open the first in-stock product.
  await page.goto("/shop");
  const card = page.locator('a[href^="/product/"]').filter({ hasNotText: "Sold out" }).first();
  await expect(card).toBeVisible();
  const productName = (await card.locator("h3").innerText()).trim();
  await card.click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(productName);

  // 3. Add to cart and to wishlist.
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText(/added to your cart/i)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Add to wishlist" }).click();
  await expect(page.getByText(/saved to your wishlist/i)).toBeVisible({ timeout: 15_000 });

  // 4. Search returns the product in the results grid.
  await page.goto("/search");
  await page.getByLabel(/search products/i).fill(productName);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.locator('div.grid a[href^="/product/"]').first()).toBeVisible({ timeout: 15_000 });

  // 5. Cart: item present, apply coupon, then head to checkout.
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible();
  await expect(page.getByRole("link", { name: productName }).first()).toBeVisible();
  await page.getByLabel(/coupon code/i).fill("SNG50");
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText("SNG50").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/discount/i).first()).toBeVisible();

  await page.getByRole("link", { name: /proceed to checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // 6. Fill address, step through delivery + payment, place the order.
  await page.getByLabel(/full name/i).fill(name);
  await page.getByLabel(/mobile number/i).fill(phone);
  await page.getByLabel(/division/i).selectOption("Dhaka");
  await page.getByLabel(/district/i).selectOption("Dhaka");
  await page.locator("#area").fill("Dhanmondi");
  await page.getByLabel(/street address/i).fill("House 12, Road 7, Block C");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }
  await page.getByRole("button", { name: /place order/i }).click();
  await page.waitForURL(/\/order-success\//, { timeout: 20_000 });

  // 7. Order confirmation + visible in the account.
  await expect(page.getByRole("heading", { name: /order placed/i })).toBeVisible();
  const orderNumber = page.url().split("/order-success/")[1];
  await expect(page.getByText(orderNumber, { exact: true }).first()).toBeVisible();

  await page.goto("/account");
  await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();

  await page.goto("/account/wishlist");
  await expect(page.getByRole("link", { name: productName }).first()).toBeVisible();
});