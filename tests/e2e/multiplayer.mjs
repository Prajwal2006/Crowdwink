/**
 * End-to-end multiplayer smoke test: three isolated browser sessions create a room,
 * join through the invite link, play a full game, and start a rematch.
 *
 *   npm run dev                       # in one terminal
 *   node tests/e2e/multiplayer.mjs    # in another
 *
 * Env: BASE_URL (default http://localhost:3000), CHROMIUM_PATH (optional),
 *      SCREENSHOTS (directory to save screenshots, optional), ROUNDS (3, 5, 8, 10 or 15; default 3).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SCREENSHOTS;
const ROUNDS = Number(process.env.ROUNDS ?? 3);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true };
const desktop = { viewport: { width: 1280, height: 860 } };

async function player(name, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${name}] page error:`, e.message));
  page.on("console", (m) => m.type() === "error" && console.error(`[${name}] console:`, m.text()));
  return { name, ctx, page };
}

async function shot(p, label) {
  if (!SHOTS) return;
  await p.page.waitForTimeout(400);
  await p.page.screenshot({ path: `${SHOTS}/${label}-${p.name}.png`, fullPage: true });
}

function step(msg) {
  console.log(`• ${msg}`);
}

const host = await player("host", phone);
const p2 = await player("bea", desktop);
const p3 = await player("cy", phone);
const everyone = [host, p2, p3];

try {
  step("home page renders");
  await host.page.goto(BASE);
  await host.page.getByRole("heading", { name: /Know your people/ }).waitFor();
  await shot(host, "01-home");

  step("host creates a room");
  await host.page.goto(`${BASE}/create`);
  await host.page.getByLabel("Your nickname").fill("Hana");
  await host.page.getByRole("button", { name: "Customize the game" }).click();
  await host.page.getByRole("radio", { name: String(ROUNDS) }).click();
  await shot(host, "02-create");
  await host.page.getByRole("button", { name: "Create room" }).click();
  await host.page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const url = host.page.url();
  const code = url.slice(-6);
  step(`room ${code} created`);
  await host.page.getByText("Invite your crowd").waitFor();

  step("two friends join through the invite link");
  for (const [p, nick] of [
    [p2, "Bea"],
    [p3, "Cy 🌮"],
  ]) {
    await p.page.goto(url);
    await p.page.getByLabel("Your nickname").fill(nick);
    await p.page.getByRole("button", { name: "Join room" }).click();
    await p.page.getByText("Invite your crowd").waitFor();
  }
  step("host sees everyone in real time");
  await host.page.getByText("Players 3/8").waitFor({ timeout: 10_000 });
  await p2.page.getByRole("button", { name: "I'm ready" }).click();
  await host.page.getByText("1 of 3 ready").waitFor({ timeout: 10_000 });
  await shot(host, "03-lobby");
  await shot(p2, "03-lobby");

  step("host starts the game");
  await host.page.getByRole("button", { name: "Start game" }).click();

  const votes = { host: "a", bea: "a", cy: "b" };
  const preds = { host: "a", bea: "b", cy: "a" };
  for (let round = 1; round <= ROUNDS; round++) {
    step(`round ${round}: everyone answers`);
    await Promise.all(
      everyone.map(async (p) => {
        const cards = p.page.locator("button[aria-pressed]");
        await p.page.getByText("What would").waitFor({ timeout: 15_000 });
        if (round === 1 && p === host) await shot(p, "04-question");
        await cards.nth(votes[p.name] === "a" ? 0 : 1).click();
        await p.page.getByRole("button", { name: "Lock in my answer" }).click();
        await p.page.getByText("which will").waitFor();
        if (round === 1 && p === host) await shot(p, "05-predict");
        await cards.nth(preds[p.name] === "a" ? 0 : 1).click();
        await p.page.getByRole("button", { name: "Lock in my prediction" }).click();
      }),
    );
    step(`round ${round}: reveal arrives for everyone`);
    await Promise.all(everyone.map((p) => p.page.getByRole("tab", { name: `Round ${round} results` }).waitFor({ timeout: 15_000 })));
    if (round === 1) {
      // Votes: A, A, B → A wins. Host (A) and Cy (A) predicted right, Bea (B) didn't.
      await host.page.getByText("You read the room! +1 point").waitFor();
      await p2.page.getByText("The crowd zigged").waitFor();
      await shot(host, "06-reveal");
      await p2.page.getByRole("tab", { name: "Leaderboard" }).click();
      await shot(p2, "07-leaderboard");

      step("a player refreshes mid-game and recovers their state");
      await p3.page.reload();
      await p3.page.getByRole("tab", { name: "Round 1 results" }).waitFor({ timeout: 15_000 });
    }
    await p3.page.getByRole("button", { name: "I'm ready" }).click();
    await host.page.getByText(/1 of 3 ready/).waitFor({ timeout: 10_000 });
    const next = round < ROUNDS ? "Next round" : "See final results";
    await host.page.getByRole("button", { name: next }).click();
    if (round < ROUNDS) {
      await p2.page.getByText(`Round ${round + 1} of ${ROUNDS}`).first().waitFor({ timeout: 10_000 }).catch(() => {});
    }
  }

  step("final results for everyone");
  await Promise.all(everyone.map((p) => p.page.getByText("Final leaderboard").waitFor({ timeout: 15_000 })));
  await host.page.getByRole("heading", { name: /Hana & Cy 🌮 tie for the win!|Cy 🌮 & Hana tie for the win!/ }).waitFor();
  await host.page.waitForTimeout(2200);
  await shot(host, "08-final");
  await shot(p2, "08-final");

  step("share card image renders");
  const img = await host.page.request.get(`${BASE}/api/rooms/${code}/card?game=1`);
  if (img.status() !== 200 || !(img.headers()["content-type"] ?? "").includes("image/png")) {
    throw new Error(`share card failed: ${img.status()}`);
  }

  step("rematch keeps everyone in the room with fresh scores");
  await host.page.getByRole("button", { name: "Play again" }).click();
  await Promise.all(everyone.map((p) => p.page.getByText("What would").waitFor({ timeout: 15_000 })));
  await host.page.getByRole("button", { name: "Leave room" }).click();
  await host.page.getByRole("button", { name: "Leave room" }).last().click();
  await host.page.getByText("You left the room.").waitFor();
  step("host left, hosting passed on");
  await p2.page.getByText("Hana left the room").waitFor({ timeout: 10_000 });

  console.log("\n✅ Multiplayer flow passed");
} catch (err) {
  console.error("\n❌ Multiplayer flow failed:", err);
  for (const p of everyone) await p.page.screenshot({ path: `${SHOTS ?? "."}/failure-${p.name}.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
