import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "",
};

// Applique le thème sauvegardé avant le premier paint pour éviter tout flash.
const themeInitScript = `
(function () {
  try {
    if (localStorage.getItem("dark-mode") === "true") {
      document.body.classList.add("dark-mode");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={raleway.className}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
