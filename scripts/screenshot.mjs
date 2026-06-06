// Take screenshots of every route at 3 densities + dialogs/drawer.
// Uses the bundled chromium. Spawns `next dev` as a child process.

import { chromium } from "playwright";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";

const ROUTES = [
  { path: "/inbox", name: "inbox" },
  { path: "/my-issues", name: "my-issues" },
  { path: "/home", name: "home" },
  { path: "/projects/eng/issues", name: "project-issues" },
  { path: "/projects/eng/cycles/23", name: "cycle-board" },
  { path: "/projects/eng", name: "project-landing" },
  { path: "/search", name: "search" },
  { path: "/settings", name: "settings" },
  { path: "/views/all", name: "view-all" },
  { path: "/views/urgent", name: "view-urgent" },
];

const DENSITIES = ["default", "compact", "roomy"];

const OUT = "G:\\ciqada2\\Projects\\jira redesign\\screenshots";

async function waitFor(url, timeoutMs = 90000) {
  const t0 = Date.now();
  let attempts = 0;
  while (Date.now() - t0 < timeoutMs) {
    attempts++;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        console.log(`  ready after ${attempts} attempt(s) (${Date.now() - t0}ms)`);
        return;
      }
    } catch (e) {
      if (attempts === 1 || attempts % 5 === 0) {
        console.log(`  waiting... (${Date.now() - t0}ms)`);
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  console.log("Starting next dev on :3737...");
  const isWindows = process.platform === "win32";
  const dev = spawn("npx", ["next", "dev", "-p", "3737"], {
    cwd: "G:\\ciqada2\\Projects\\jira redesign\\apps\\web",
    stdio: ["ignore", "pipe", "pipe"],
    detached: !isWindows,
    windowsHide: true,
    shell: isWindows,
  });
  dev.stdout.on("data", (b) => process.stdout.write(`[dev] ${b}`));
  dev.stderr.on("data", (b) => process.stderr.write(`[dev-err] ${b}`));

  const killDev = () => {
    if (isWindows) {
      try {
        // Kill the whole process tree on Windows
        spawn("taskkill", ["/PID", String(dev.pid), "/T", "/F"], { shell: true }).on("exit", () => {});
      } catch {}
    } else {
      try { process.kill(-dev.pid, "SIGKILL"); } catch {}
    }
  };

  await waitFor("http://localhost:3737/inbox");
  console.log("Server ready.");

  const browser = await chromium.launch({ headless: true });

  try {
    for (const density of DENSITIES) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();

      await page.addInitScript((d) => {
        const payload = {
          state: { density: d, groupBy: "none", sortKey: "updated", sortDir: "desc", showCompletedCycles: false },
          version: 0,
        };
        window.localStorage.setItem("jira-redesign-ui", JSON.stringify(payload));
      }, density);

      for (const r of ROUTES) {
        try {
          await page.goto(`http://localhost:3737${r.path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(500);
          await page.screenshot({ path: join(OUT, `${density}-${r.name}.png`), timeout: 15000 });
          console.log(`  [${density}] ${r.path} ✓`);
        } catch (e) {
          console.log(`  [${density}] ${r.path} ✗ ${e.message}`);
        }
      }

      if (density === "default") {
        // Drawer
        try {
          await page.goto("http://localhost:3737/my-issues", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const row = page.locator("text=/^(ENG|DSG|GRW|OPS)-\\d+/").first();
          if (await row.count() > 0) {
            await row.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: join(OUT, `${density}-drawer-open.png`) });
            console.log(`  [${density}] drawer-open ✓`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
          }
        } catch (e) {
          console.log(`  [${density}] drawer-open ✗ ${e.message}`);
        }

        // Cheatsheet
        try {
          await page.keyboard.press("?");
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(OUT, `${density}-cheatsheet.png`) });
          console.log(`  [${density}] cheatsheet ✓`);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(200);
        } catch (e) {
          console.log(`  [${density}] cheatsheet ✗ ${e.message}`);
        }

        // Create dialog
        try {
          // Blur any focused input (e.g. cheatsheet filter) so global `c` shortcut fires
          await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
          await page.waitForTimeout(100);
          await page.keyboard.press("c");
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(OUT, `${density}-create-dialog.png`) });
          console.log(`  [${density}] create-dialog ✓`);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(200);
        } catch (e) {
          console.log(`  [${density}] create-dialog ✗ ${e.message}`);
        }

        // Command palette
        try {
          await page.keyboard.press("Control+k");
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(OUT, `${density}-command-palette.png`) });
          console.log(`  [${density}] command-palette ✓`);
          await page.keyboard.press("Escape");
        } catch (e) {
          console.log(`  [${density}] command-palette ✗ ${e.message}`);
        }

        // Filter popover with chips visible
        try {
          await page.goto("http://localhost:3737/my-issues", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const filterBtn = page.locator("button:has-text('Filter')").first();
          if (await filterBtn.count() > 0) {
            await filterBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: join(OUT, `${density}-filter-popover.png`) });
            console.log(`  [${density}] filter-popover ✓`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
          }
        } catch (e) {
          console.log(`  [${density}] filter-popover ✗ ${e.message}`);
        }

        // Save-as-view popover (click bookmark icon next to view title)
        try {
          await page.goto("http://localhost:3737/views/all", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const saveBtn = page.locator("button[aria-haspopup='menu'], button[aria-label*='Save' i]").first();
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: join(OUT, `${density}-save-as-view.png`) });
            console.log(`  [${density}] save-as-view ✓`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
          }
        } catch (e) {
          console.log(`  [${density}] save-as-view ✗ ${e.message}`);
        }

        // Density menu open
        try {
          await page.goto("http://localhost:3737/my-issues", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const densityBtn = page.locator("button:has-text('Compact'), button:has-text('Roomy'), button:has-text('Default')").first();
          if (await densityBtn.count() > 0) {
            await densityBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: join(OUT, `${density}-density-menu.png`) });
            console.log(`  [${density}] density-menu ✓`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
          }
        } catch (e) {
          console.log(`  [${density}] density-menu ✗ ${e.message}`);
        }

        // Bulk action bar (select 3 rows via cmd+click)
        try {
          await page.goto("http://localhost:3737/my-issues", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const rows = page.locator("[data-issue-id]").first();
          if (await rows.count() > 0) {
            // Click first row
            await rows.click();
            await page.waitForTimeout(150);
            // Shift+click third row to select range
            const allRows = page.locator("[data-issue-id]");
            const count = await allRows.count();
            if (count >= 3) {
              await allRows.nth(2).click({ modifiers: ["Shift"] });
              await page.waitForTimeout(400);
              await page.screenshot({ path: join(OUT, `${density}-bulk-bar.png`) });
              console.log(`  [${density}] bulk-bar ✓`);
              await page.keyboard.press("Escape");
              await page.waitForTimeout(200);
            }
          }
        } catch (e) {
          console.log(`  [${density}] bulk-bar ✗ ${e.message}`);
        }

        // Undo toast (trigger a status change via keyboard in drawer)
        try {
          await page.goto("http://localhost:3737/my-issues", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const firstRow = page.locator("[data-issue-id]").first();
          if (await firstRow.count() > 0) {
            await firstRow.click();
            await page.waitForTimeout(400);
            // ⌘1-5 in drawer to change status
            await page.keyboard.press("Meta+1");
            await page.waitForTimeout(500);
            await page.screenshot({ path: join(OUT, `${density}-undo-toast.png`) });
            console.log(`  [${density}] undo-toast ✓`);
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
          }
        } catch (e) {
          console.log(`  [${density}] undo-toast ✗ ${e.message}`);
        }

        // Cycle board (alternate view) — both default + drag overlay
        try {
          await page.goto("http://localhost:3737/projects/eng/cycles/23", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          await page.screenshot({ path: join(OUT, `${density}-cycle-board.png`) });
          console.log(`  [${density}] cycle-board (board) ✓`);

          // Board drag overlay
          const card = page.locator("[data-board-card]").first();
          if (await card.count() > 0) {
            const box = await card.boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 5 });
              await page.waitForTimeout(250);
              await page.screenshot({ path: join(OUT, `${density}-board-drag.png`) });
              console.log(`  [${density}] board-drag ✓`);
              await page.mouse.up();
              await page.waitForTimeout(200);
            }
          }
        } catch (e) {
          console.log(`  [${density}] cycle-board ✗ ${e.message}`);
        }

        // List drag — grab a row and capture mid-drag
        try {
          await page.goto("http://localhost:3737/my-issues", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(700);
          const row = page.locator("[data-issue-id]").first();
          if (await row.count() > 0) {
            const handle = row.locator("[data-drag-handle], button[aria-roledescription='sortable']").first();
            const targetBox = (await handle.count()) ? await handle.boundingBox() : await row.boundingBox();
            if (targetBox) {
              await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
              await page.mouse.down();
              await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 + 50, { steps: 8 });
              await page.waitForTimeout(250);
              await page.screenshot({ path: join(OUT, `${density}-list-drag.png`) });
              console.log(`  [${density}] list-drag ✓`);
              await page.mouse.up();
              await page.waitForTimeout(200);
            }
          }
        } catch (e) {
          console.log(`  [${density}] list-drag ✗ ${e.message}`);
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
    killDev();
  }
  console.log("Done.");
  setTimeout(() => process.exit(0), 500);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
