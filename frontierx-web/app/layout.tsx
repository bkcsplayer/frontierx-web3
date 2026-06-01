import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_SC, Orbitron, Sora } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SepoliaDemoBanner } from "@/components/wallet/SepoliaDemoBanner";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { Web3Provider } from "@/components/providers/Web3Provider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "FrontierX Protocol",
  description: "A premium Web3 and AI dual-token ecosystem demo.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${orbitron.variable} ${jetbrainsMono.variable} ${notoSansSc.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <I18nProvider>
          <Web3Provider>
            <Navbar />
            <SepoliaDemoBanner />
            {children}
            <Footer />
          </Web3Provider>
        </I18nProvider>
      </body>
    </html>
  );
}
