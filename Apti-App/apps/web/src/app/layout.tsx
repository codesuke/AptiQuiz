import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AptiQuiz",
  description: "Live, fair aptitude competition for college placement preparation.",
  icons: {
    icon: { url: "/brand/aptiquiz-icon.png", type: "image/png" },
    apple: { url: "/brand/aptiquiz-icon.png", type: "image/png" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
