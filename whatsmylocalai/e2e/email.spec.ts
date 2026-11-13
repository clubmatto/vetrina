import { test, expect, type Page } from "@playwright/test";

import { skipReveal } from "./helpers";

const SIGNUP = "**/waiting-list/signup";

/** The form posts cross-origin, so the preflight has to be answered too. */
async function mockSignup(page: Page, status: number): Promise<void> {
  await page.route(SIGNUP, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST",
          "access-control-allow-headers": "content-type",
        },
      });
      return;
    }

    await route.fulfill({
      status,
      headers: {
        "access-control-allow-origin": "*",
        "content-type": "application/json",
      },
      body: "{}",
    });
  });
}

async function openForm(page: Page): Promise<void> {
  await skipReveal(page);
  await page.goto("/?ram=8&vram=8");
  await page.getByRole("button", { name: "Get updates" }).click();
}

test("submits the email with the product id", async ({ page }) => {
  await mockSignup(page, 200);
  await openForm(page);

  await page.getByLabel("Email address").fill("reader@example.com");

  const posted = page.waitForRequest(
    (request) =>
      request.url().endsWith("/waiting-list/signup") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Subscribe" }).click();

  const body = (await posted).postDataJSON() as {
    email: string;
    product_id: string;
  };
  expect(body.email).toBe("reader@example.com");
  expect(body.product_id).toMatch(/^[0-9a-f-]{36}$/);

  await expect(page.getByText("Thanks! We'll be in touch.")).toBeVisible();
});

test("shows an error when the signup fails", async ({ page }) => {
  await mockSignup(page, 500);
  await openForm(page);

  await page.getByLabel("Email address").fill("reader@example.com");
  await page.getByRole("button", { name: "Subscribe" }).click();

  await expect(
    page.getByText(/Couldn.t subscribe you right now/),
  ).toBeVisible();
});
