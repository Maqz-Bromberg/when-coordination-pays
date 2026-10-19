import type { Metadata } from "next";
import localFont from "next/font/local";
import Chrome from "./components/chrome/Chrome";
import ScrollProgress from "./components/chrome/ScrollProgress";
import { themeScript } from "./components/chrome/ThemeToggle";
import LightboxHost from "./components/figure/Lightbox";
import "katex/dist/katex.min.css";
import "./styles/tokens.css";
import "./styles/site.css";

// Self-hosted variable fonts (Latin subset; see fonts/README.md), so the build needs no network
const bricolage = localFont({ src: "./fonts/BricolageGrotesque-latin.woff2", weight: "200 800", variable: "--font-display" });
const newsreader = localFont({
  src: [
    { path: "./fonts/Newsreader-latin.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/Newsreader-Italic-latin.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-serif",
});
const jetbrainsMono = localFont({ src: "./fonts/JetBrainsMono-latin.woff2", weight: "100 800", variable: "--font-mono", adjustFontFallback: false });

export const metadata: Metadata = {
  title: { default: "When coordination pays", template: "%s · When coordination pays" },
  description: "How a group that learns whom to listen to coordinates around a moving, noisy source: regimes, cost and benefit, mechanisms and implications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${newsreader.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ScrollProgress />
        <Chrome />
        <div className="stage">{children}</div>
        <LightboxHost />
      </body>
    </html>
  );
}
