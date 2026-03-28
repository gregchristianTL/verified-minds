import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SoundProvider } from "@/providers/SoundProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verified Minds",
  description: "Turn your expertise into an AI agent that earns for you.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F0A08",
};

// Old-school ASCII credit block — visible in View Source and DevTools console
const ASCII_CREDITS = `
██    ██ ███████ ██████  ██ ███████ ██ ███████ ██████
██    ██ ██      ██   ██ ██ ██      ██ ██      ██   ██
██    ██ █████   ██████  ██ █████   ██ █████   ██   ██
 ██  ██  ██      ██   ██ ██ ██      ██ ██      ██   ██
  ████   ███████ ██   ██ ██ ██      ██ ███████ ██████

███    ███ ██ ███    ██ ██████  ███████
████  ████ ██ ████   ██ ██   ██ ██
██ ████ ██ ██ ██ ██  ██ ██   ██ ███████
██  ██  ██ ██ ██  ██ ██ ██   ██      ██
██      ██ ██ ██   ████ ██████  ███████

──────────────────────────────────────────────────────
Built by Tribute Labs  ·  tributelabs.xyz
For World × Coinbase
v0.1.0
──────────────────────────────────────────────────────
`;

const HTML_COMMENT = `<!--\n${ASCII_CREDITS}\n-->`;

const CONSOLE_SCRIPT = `console.log(\`%c${ASCII_CREDITS}\`,\"color:#FF00FF;font-family:monospace;font-size:11px;\");`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        {/* ASCII credits easter egg — check View Source or DevTools console */}
        <span
          dangerouslySetInnerHTML={{ __html: HTML_COMMENT }}
          style={{ display: "none" }}
        />
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_SCRIPT }} />

        <ThemeProvider>
          <SoundProvider>
            {children}
          </SoundProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
