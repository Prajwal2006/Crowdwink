import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { AVATARS } from "@/lib/game/constants";
import { errorResponse, roomCodeParam } from "@/lib/server/http";
import { getSummary } from "@/lib/server/view";

type Summary = NonNullable<Awaited<ReturnType<typeof getSummary>>>;

const INK = "#1d1537";

let fontCache: Promise<{ semibold: Buffer; extrabold: Buffer }> | null = null;
function loadFonts() {
  fontCache ??= Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/bricolage-grotesque-latin-600-normal.woff")),
    readFile(join(process.cwd(), "src/assets/fonts/bricolage-grotesque-latin-800-normal.woff")),
  ]).then(([semibold, extrabold]) => ({ semibold, extrabold }));
  return fontCache;
}

/** Shareable PNG results card for a finished game. */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]/card">) {
  try {
    const code = roomCodeParam((await ctx.params).code);
    const game = Number(new URL(req.url).searchParams.get("game") ?? "1");
    if (!Number.isInteger(game) || game < 1) return new Response("Bad game", { status: 400 });
    const summary = await getSummary(code, game);
    if (!summary) return new Response("Results not found", { status: 404 });

    // Emoji and some scripts need glyphs fetched at render time. Render to a buffer
    // first; if that fails (e.g. no outbound network), retry with plain-text names.
    try {
      return await toPng(summary, (s) => s);
    } catch (err) {
      console.warn("[card] falling back to plain text:", (err as Error).message);
      return await toPng(summary, plainText);
    }
  } catch (err) {
    return errorResponse(err);
  }
}

function plainText(value: string) {
  const ascii = value.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  return ascii || "Player";
}

async function toPng(summary: Summary, clean: (s: string) => string) {
  const fonts = await loadFonts();
  const rows = summary.standings.slice(0, 8);
  const winners = summary.winnerNames.map(clean);
  const colors = AVATARS.map((a) => a.color);
  const height = Math.max(1080, 560 + rows.length * 104);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#6c4dff",
          padding: 64,
          color: "white",
          fontFamily: "Bricolage",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="72" height="72" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="21" fill="#ffd23f" stroke={INK} strokeWidth="3.5" />
              <circle cx="16.5" cy="20" r="3.4" fill={INK} />
              <path d="M27.5 20.5c1.8-2.6 5.2-2.6 7 0" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
              <path d="M15 28.5c2.6 4.6 15.4 4.6 18 0" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 52, fontWeight: 800 }}>crowdwink</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              background: "#ffd23f",
              color: INK,
              border: `4px solid ${INK}`,
              borderRadius: 999,
              padding: "6px 22px",
            }}
          >
            {`${summary.roundsPlayed} rounds`}
          </div>
        </div>

        <div style={{ marginTop: 56, fontSize: 30, fontWeight: 600, opacity: 0.8, letterSpacing: 2 }}>
          {clean(summary.roomName).toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 8 }}>
          {winners.length ? `${winners.join(" & ")} ${winners.length > 1 ? "win" : "wins"}!` : "No winner this time"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 44 }}>
          {rows.map((r, i) => (
            <div
              key={r.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                background: r.rank === 1 ? "#ffd23f" : "white",
                color: INK,
                border: `4px solid ${INK}`,
                boxShadow: `6px 6px 0 0 ${INK}`,
                borderRadius: 24,
                padding: "14px 26px",
                fontSize: 34,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", width: 40, fontWeight: 800 }}>{String(r.rank)}</div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: colors[(r.avatar ?? i) % colors.length],
                  border: `4px solid ${INK}`,
                  display: "flex",
                }}
              />
              <div style={{ display: "flex", flex: 1, fontWeight: 800 }}>{clean(r.nickname)}</div>
              <div style={{ display: "flex", opacity: 0.7 }}>
                {`${r.predicted ? Math.round((r.correct / r.predicted) * 100) : 0}% acc`}
              </div>
              <div style={{ display: "flex", width: 150, justifyContent: "flex-end", fontWeight: 800 }}>
                {`${r.score} pts`}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 32, fontWeight: 600, opacity: 0.9 }}>
          Know your people. Beat the crowd.
        </div>
      </div>
    ),
    {
      width: 1080,
      height,
      fonts: [
        { name: "Bricolage", data: fonts.semibold, weight: 600, style: "normal" },
        { name: "Bricolage", data: fonts.extrabold, weight: 800, style: "normal" },
      ],
    },
  );
  const png = await image.arrayBuffer();
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
