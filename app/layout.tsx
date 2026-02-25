import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Resource Scheduler",
  description: "Per-project resource scheduling (8h/day)"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
