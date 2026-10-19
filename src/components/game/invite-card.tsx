"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Copy, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteUrl } from "@/lib/client/room-code";
import { copyText } from "./game-header";

const noopSubscribe = () => () => {};

export function InviteCard({ code, roomName }: { code: string; roomName: string }) {
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const url = inviteUrl(code);

  useEffect(() => {
    if (!showQr || qr) return;
    let alive = true;
    void import("qrcode").then((QR) =>
      QR.toString(url, { type: "svg", margin: 1, color: { dark: "#1d1537", light: "#ffffff" } }).then((svg) => {
        if (alive) setQr(svg);
      }),
    );
    return () => {
      alive = false;
    };
  }, [showQr, qr, url]);

  return (
    <section aria-labelledby="invite-title" className="rounded-3xl bg-grape p-5 text-white pop-lg sm:p-6">
      <p id="invite-title" className="text-sm font-bold tracking-wide text-white/80 uppercase">
        Invite your crowd
      </p>
      <p
        className="mt-1 font-display text-5xl font-extrabold tracking-[0.18em] sm:text-6xl"
        aria-label={`Room code ${code.split("").join(" ")}`}
      >
        {code}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white/80">{url.replace(/^https?:\/\//, "")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="sun"
          onClick={async () => {
            if (await copyText(url)) toast.success("Invite link copied! Paste it in the group chat.");
            else toast(`Share this code: ${code}`);
          }}
        >
          <Copy /> Copy link
        </Button>
        {canShare && (
          <Button
            variant="outline"
            onClick={() =>
              navigator
                .share({ title: "Join my Crowdwink room", text: `Join "${roomName}" on Crowdwink! Code: ${code}`, url })
                .catch(() => {})
            }
          >
            <Share2 /> Share
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
          <QrCode /> {showQr ? "Hide QR" : "QR code"}
        </Button>
      </div>
      {showQr && (
        <div className="mt-4 flex justify-center">
          <div
            className="size-52 rounded-2xl bg-white p-2 pop [&_svg]:h-full [&_svg]:w-full"
            role="img"
            aria-label="QR code for the invite link"
            dangerouslySetInnerHTML={qr ? { __html: qr } : undefined}
          />
        </div>
      )}
    </section>
  );
}
