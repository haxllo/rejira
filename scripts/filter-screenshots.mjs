// Focused screenshots: filter chip removal + filter button states.
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";

const OUT = "G:\\ciqada2\\Projects\\jira redesign\\screenshots";
const URL = "http://localhost:3738";

async function waitFor(url, timeoutMs = 90000) {
  const t0 = Date.now();
  let attempts = 0;
  while (Date.now() - t0 < timeoutMs) {
    attempts++;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timeout");
}

async function main() {
  await mkdir(OUT, { recursive: true });

  console.log("Starting next dev on :3738...");
  const dev = spawn("npx", ["next", "dev", "-p", "3738"], {
    cwd: "G:\\ciqada2\\Projects\\jira redesign\\apps\\web",
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    windowsHide: true,
    shell: true,
  });
  dev.stdout.on("data", () => {});
  dev.stderr.on("data", () => {});

  const killDev = () => {
    try { spawn("taskkill", ["/PID", String(dev.pid), "/T", "/F"], { shell: true }).on("exit", () => {}); } catch {}
  };
  process.on("exit", killDev);

  await waitFor("http://localhost:3738/inbox");
  console.log("Server ready.");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Force default density + nothing else
  await page.addInitScript(() => {
    const payload = {
      state: { density: "default", groupBy: "none", sortKey: "updated", sortDir: "desc", showCompletedCycles: false },
      version: 0,
    };
    window.localStorage.setItem("jira-redesign-ui", JSON.stringify(payload));
  });

  // -- 1. No filters applied (empty state with "+ Add filter")
  await page.goto(`${URL}/views/all`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "filter-empty-state.png") });
  console.log("filter-empty-state.png");

  // -- 2. Filters applied (default state for views/all)
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "filter-with-chips.png") });
  console.log("filter-with-chips.png");

  // -- 3. Hover state on a filter chip
  const firstChip = page.locator("button:has-text('Status:')").first();
  if (await firstChip.count() > 0) {
    const box = await firstChip.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT, "filter-chip-hover.png"), clip: { x: 200, y: 200, width: 1100, height: 100 } });
      console.log("filter-chip-hover.png");
    }
  }
  await page.mouse.move(0, 0);

  // -- 4. Open filter popover
  const filterBtn = page.locator("button:has-text('Filter')").first();
  if (await filterBtn.count() > 0) {
    const box = await filterBtn.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT, "filter-popover-status.png") });
      console.log("filter-popover-status.png");

      // Switch to assignee section (use popover-side button only)
      const assigneeBtn = page.locator("div.w-44 button:has-text('Assignee')").first();
      const ab = await assigneeBtn.boundingBox();
      if (ab) {
        await page.mouse.click(ab.x + ab.width / 2, ab.y + ab.height / 2);
        await page.waitForTimeout(250);
        await page.screenshot({ path: join(OUT, "filter-popover-assignee.png") });
        console.log("filter-popover-assignee.png");
      }

      // Close popover
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  }

  // -- 5. Remove a chip — capture mid-animation (3 frames: 0ms, 100ms, 250ms)
  const allStatusChips = page.locator("button:has-text('Status:')");
  const chipCount = await allStatusChips.count();
  if (chipCount > 0) {
    const targetChip = allStatusChips.first();
    const tbox = await targetChip.boundingBox();
    if (tbox) {
      // Frame 0: just before click
      await page.screenshot({ path: join(OUT, "filter-chip-removal-0ms.png"), clip: { x: 200, y: 240, width: 1100, height: 60 } });
      await page.mouse.click(tbox.x + tbox.width / 2, tbox.y + tbox.height / 2);
      // Frame 1: ~80ms in
      await page.waitForTimeout(80);
      await page.screenshot({ path: join(OUT, "filter-chip-removal-80ms.png"), clip: { x: 200, y: 240, width: 1100, height: 60 } });
      // Frame 2: ~180ms in
      await page.waitForTimeout(100);
      await page.screenshot({ path: join(OUT, "filter-chip-removal-180ms.png"), clip: { x: 200, y: 240, width: 1100, height: 60 } });
      // Frame 3: settled
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, "filter-chip-removal-settled.png"), clip: { x: 200, y: 240, width: 1100, height: 60 } });
      console.log("filter-chip-removal-{0,80,180,settled}ms.png");
    }
  }

  // -- 6. Close-up of the Filter button area
  await page.screenshot({ path: join(OUT, "filter-button-zoom.png"), clip: { x: 1100, y: 220, width: 340, height: 80 } });
  console.log("filter-button-zoom.png");

  // -- 7. Clear all
  const clearAll = page.locator("button:has-text('Clear all')").first();
  if (await clearAll.count() > 0) {
    const cbox = await clearAll.boundingBox();
    if (cbox) {
      await page.mouse.click(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, "filter-cleared.png") });
      console.log("filter-cleared.png");
    }
  }

  await browser.close();
  killDev();
  setTimeout(() => process.exit(0), 500);
}

main().catch((e) => { console.error(e); process.exit(1); });
