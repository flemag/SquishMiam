import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${fredoka.variable} antialiased`}>{children}</body>
    </html>
  );
}
