import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "NOIR — Beyond Fashion. Beyond Ordinary.",
  description: "Premium Indian Streetwear & Luxury Fashion Studio. Immersive 3D Digital Experience.",
  keywords: ["Luxury Streetwear", "NOIR Studio", "Indian Fashion", "3D Fashion", "Mumbai Delhi Bengaluru"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark scroll-smooth selection:bg-[#c5a46d]/30 selection:text-[#c5a46d]"
    >
      <body className="bg-[#050505] text-[#FFFFFF] antialiased overflow-x-hidden min-h-screen">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
