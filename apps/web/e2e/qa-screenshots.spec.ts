import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// Phase 10, point 4: capture every widget type × format × breakpoint from the
// gated /qa-gallery route (unlocked here by QA_SCREENSHOT_MODE=1 in the
// webServer env) and drop one PNG per tile into qa-screenshots/, published as a
// CI artifact. The gallery renders the REAL public Renderers with the registry
// sample configs, so these are true-scale captures of what visitors see.
const OUT_DIR = path.resolve(process.cwd(), "qa-screenshots");

test("capture every widget tile from the QA gallery", async ({ page }) => {
  // Hundreds of per-tile screenshots (every type × format × breakpoint) — give
  // this dedicated capture job plenty of headroom.
  test.setTimeout(600_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Wide viewport so even the 4x4 desktop tiles lay out without wrapping oddly;
  // each tile has an explicit inline size, so the viewport only affects layout.
  await page.setViewportSize({ width: 1600, height: 1200 });
  // Not `networkidle`: several tiles poll live endpoints (Spotify, realtime,
  // visits) so the network never fully settles. Wait for the DOM + the tiles.
  const res = await page.goto("/qa-gallery", { waitUntil: "domcontentloaded" });
  expect(res?.status(), "/qa-gallery HTTP status (needs QA_SCREENSHOT_MODE=1)").toBe(200);

  const tiles = page.locator("[data-qa-tile]");
  await tiles.first().waitFor({ state: "visible", timeout: 15_000 });
  // Give async server widgets + client mounts a beat to paint before capture.
  await page.waitForTimeout(1500);
  const n = await tiles.count();
  expect(n, "number of QA tiles rendered").toBeGreaterThan(0);

  let captured = 0;
  for (let i = 0; i < n; i++) {
    const el = tiles.nth(i);
    const type = (await el.getAttribute("data-qa-type")) ?? "unknown";
    const format = (await el.getAttribute("data-qa-format")) ?? "0x0";
    const bp = (await el.getAttribute("data-qa-bp")) ?? "bp";
    const file = path.join(OUT_DIR, `${type}__${format}__${bp}.png`);
    try {
      // element.screenshot auto-scrolls the tile into view.
      await el.screenshot({ path: file, timeout: 15_000 });
      captured++;
    } catch {
      // Best-effort: a single un-capturable tile must not fail the whole job.
    }
  }

  // We must have captured a screenshot for the overwhelming majority of tiles.
  expect(captured, "tiles successfully screenshotted").toBeGreaterThan(n * 0.9);
  console.log(`QA gallery: captured ${captured}/${n} tile screenshots into ${OUT_DIR}`);
});
