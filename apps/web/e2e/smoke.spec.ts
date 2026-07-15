import { test, expect, type Page } from "@playwright/test";

// The automatic guard for the absolute rule: cenacrew.com/qrcode must always
// work and must NEVER render two tiles on top of each other. Runs against a
// production build with NO env vars (local-config fallback), at the mobile
// (390px) and desktop breakpoints.

type Box = { x: number; y: number; width: number; height: number };

// Two boxes overlap when they share area. A 1px inset absorbs sub-pixel border
// rounding so touching-but-not-overlapping tiles don't false-positive.
function overlaps(a: Box, b: Box): boolean {
  const e = 1;
  return (
    a.x + e < b.x + b.width - e &&
    a.x + a.width - e > b.x + e &&
    a.y + e < b.y + b.height - e &&
    a.y + a.height - e > b.y + e
  );
}

async function tileBoxes(page: Page): Promise<Box[]> {
  const tiles = page.locator(".qr-grid .qr-tile");
  const n = await tiles.count();
  const boxes: Box[] = [];
  for (let i = 0; i < n; i++) {
    const box = await tiles.nth(i).boundingBox();
    if (box) boxes.push(box);
  }
  return boxes;
}

for (const vp of [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 1000 },
]) {
  test(`/qrcode renders header + tiles with zero overlap (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const res = await page.goto("/qrcode", { waitUntil: "networkidle" });
    expect(res?.status(), "/qrcode HTTP status").toBe(200);

    // Header present and populated.
    await expect(page.locator(".qr-header")).toBeVisible();
    await expect(page.locator(".qr-name")).not.toBeEmpty();

    // Tiles rendered.
    const boxes = await tileBoxes(page);
    expect(boxes.length, "number of rendered tiles").toBeGreaterThan(0);

    // No two tiles overlap.
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(
          overlaps(boxes[i], boxes[j]),
          `tiles ${i} and ${j} overlap at ${vp.name}: ${JSON.stringify(boxes[i])} vs ${JSON.stringify(boxes[j])}`,
        ).toBe(false);
      }
    }
  });
}

test("/ (portfolio) responds 200 and renders", async ({ page }) => {
  const res = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(res?.status(), "/ HTTP status").toBe(200);
  await expect(page.locator("body")).toBeVisible();
});
