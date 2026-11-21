import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHM | Integrated Asset Intelligence",
  description: "Integrated inspection, corrosion and production data workspace for Pertamina Hulu Mahakam.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
