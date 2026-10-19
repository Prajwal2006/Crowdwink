import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Crowdwink — Know your people. Beat the crowd.",
    template: "%s · Crowdwink",
  },
  description:
    "A free multiplayer party game. Answer fun would-you-rather questions, predict what your friends will pick, and see who reads the room best. No sign-up.",
  applicationName: "Crowdwink",
  openGraph: {
    title: "Crowdwink — Know your people. Beat the crowd.",
    description: "Answer, predict the majority, and see who knows the group best. Free, no sign-up, 2–8 players.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff7ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-xl bg-sun px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
