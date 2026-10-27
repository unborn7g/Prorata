import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prorata — Split the meter fairly",
  description:
    "Split a shared prepaid electricity meter top-up fairly among flatmates by equal share, days present, or days times appliance weight.",
  icons: {
    icon: "/icon.svg",
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem('prorata-theme');document.documentElement.setAttribute('data-theme',(m==='light'||m==='dark'||m==='auto')?m:'dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
