/**
 * Minimal Pusher Channels–compatible server for local testing of the Pusher code path
 * without a Pusher account. Implements just what Crowdwink uses: presence channels with
 * signature-checked auth, member add/remove events, and the HTTP trigger API.
 *
 *   node tests/e2e/mock-pusher-server.mjs      # listens on :6001, app id "app", key "key", secret "secret"
 *
 * Then run the app with:
 *   PUSHER_APP_ID=app PUSHER_SECRET=secret NEXT_PUBLIC_PUSHER_KEY=key \
 *   PUSHER_HOST=127.0.0.1 PUSHER_PORT=6001 PUSHER_USE_TLS=false \
 *   NEXT_PUBLIC_PUSHER_HOST=127.0.0.1 NEXT_PUBLIC_PUSHER_PORT=6001 NEXT_PUBLIC_PUSHER_USE_TLS=false npm run dev
 *
 * Not for production. Use Pusher or Soketi there.
 */
import { createHmac, randomInt } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 6001);
const KEY = process.env.MOCK_PUSHER_KEY ?? "key";
const SECRET = process.env.MOCK_PUSHER_SECRET ?? "secret";

/** channel -> Map<socket, member> */
const channels = new Map();

const send = (ws, event, data, channel) =>
  ws.send(JSON.stringify({ event, ...(channel ? { channel } : {}), data: typeof data === "string" ? data : JSON.stringify(data) }));

function members(channel) {
  const unique = new Map();
  for (const m of channels.get(channel)?.values() ?? []) unique.set(m.user_id, m.user_info ?? {});
  return unique;
}

const server = createServer((req, res) => {
  const match = /^\/apps\/[^/]+\/events/.exec(req.url ?? "");
  if (req.method !== "POST" || !match) {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    try {
      const evt = JSON.parse(body);
      const targets = evt.channels ?? [evt.channel];
      for (const ch of targets) for (const ws of channels.get(ch)?.keys() ?? []) send(ws, evt.name, evt.data, ch);
      res.writeHead(200, { "content-type": "application/json" }).end("{}");
    } catch {
      res.writeHead(400).end();
    }
  });
});

const wss = new WebSocketServer({ server });
wss.on("connection", (ws, req) => {
  if (!(req.url ?? "").startsWith(`/app/${KEY}`)) return ws.close(4001, "unknown app");
  const socketId = `${randomInt(1e9)}.${randomInt(1e9)}`;
  send(ws, "pusher:connection_established", { socket_id: socketId, activity_timeout: 120 });

  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.event === "pusher:ping") return send(ws, "pusher:pong", {});
    if (msg.event === "pusher:unsubscribe") return leave(ws, msg.data.channel);
    if (msg.event !== "pusher:subscribe") return;
    const { channel, auth, channel_data } = msg.data;
    const expected = createHmac("sha256", SECRET).update(`${socketId}:${channel}:${channel_data ?? ""}`).digest("hex");
    if (auth !== `${KEY}:${expected}`) {
      return send(ws, "pusher:subscription_error", { type: "AuthError", status: 401 }, channel);
    }
    const member = JSON.parse(channel_data);
    if (!channels.has(channel)) channels.set(channel, new Map());
    const isNew = !members(channel).has(member.user_id);
    channels.get(channel).set(ws, member);
    const all = members(channel);
    send(
      ws,
      "pusher_internal:subscription_succeeded",
      { presence: { ids: [...all.keys()], hash: Object.fromEntries(all), count: all.size } },
      channel,
    );
    if (isNew) {
      for (const other of channels.get(channel).keys()) {
        if (other !== ws) send(other, "pusher_internal:member_added", member, channel);
      }
    }
  });

  const leave = (socket, channel) => {
    const subs = channels.get(channel);
    const member = subs?.get(socket);
    if (!member) return;
    subs.delete(socket);
    if (!members(channel).has(member.user_id)) {
      for (const other of subs.keys()) send(other, "pusher_internal:member_removed", { user_id: member.user_id }, channel);
    }
  };
  ws.on("close", () => {
    for (const ch of channels.keys()) leave(ws, ch);
  });
});

server.listen(PORT, () => console.log(`mock pusher listening on :${PORT}`));
