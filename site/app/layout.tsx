import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Newsreader } from "next/font/google";
import Chrome from "./components/chrome/Chrome";
import ScrollProgress from "./components/chrome/ScrollProgress";
import { themeScript } from "./components/chrome/ThemeToggle";
import LightboxHost from "./components/figure/Lightbox";
import "./styles/tokens.css";
import "./styles/site.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700", "800"] });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"], weight: ["400", "600"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "When coordination pays", template: "%s · When coordination pays" },
  description: "How a group that learns whom to listen to coordinates around a moving, noisy source: regimes, cost and benefit, mechanisms and implications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
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
