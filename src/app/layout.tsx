import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import { cookies } from "next/headers";
import { themeDepuisValeur } from "@/lib/themes";
import FondAnime from "@/components/fond-anime";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Miamz — Ton compagnon repas",
  description:
    "Planifie tes repas, génère ta liste de courses et cuisine accompagné de Miamz. Bien manger, sans charge mentale.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Thème choisi par l'utilisateur (cookie, posé par le sélecteur) ; défaut manga.
  const theme = themeDepuisValeur((await cookies()).get("miamz-theme")?.value);

  return (
    <html lang="fr" data-theme={theme}>
      <body className={`${fredoka.variable} antialiased`}>
        <FondAnime />
        {children}
      </body>
    </html>
  );
}
