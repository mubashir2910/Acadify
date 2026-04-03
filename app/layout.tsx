import type { Metadata } from "next";
import { Poppins, Libre_Baskerville, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Script from "next/script";
import "./globals.css";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://acadify.tech/#organization",
      name: "Acadify",
      url: "https://acadify.tech",
      logo: {
        "@type": "ImageObject",
        url: "https://acadify.tech/acadify.png",
      },
      description:
        "Acadify is a modern school management platform helping schools manage students, teachers, attendance, timetables, and academic operations.",
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": "https://acadify.tech/#website",
      url: "https://acadify.tech",
      name: "Acadify",
      publisher: { "@id": "https://acadify.tech/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Acadify",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: "https://acadify.tech",
      description:
        "A simple and affordable school management platform for managing students, teachers, attendance, timetables, and more.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free trial available",
      },
      publisher: { "@id": "https://acadify.tech/#organization" },
    },
  ],
};

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://acadify.tech"),
  title: {
    default: "Acadify — School Management Platform",
    template: "%s | Acadify",
  },
  description:
    "Acadify is a modern, affordable school management platform that helps schools manage students, teachers, attendance, timetables, and more — all in one place.",
  keywords: [
    "school management system",
    "school management software",
    "student management",
    "teacher attendance",
    "school ERP",
    "academic management",
    "school software India",
    "attendance management",
    "timetable management",
    "school platform",
  ],
  authors: [{ name: "Acadify" }],
  creator: "Acadify",
  publisher: "Acadify",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://acadify.tech",
    siteName: "Acadify",
    title: "Acadify — Modern School Management Platform",
    description:
      "A simple and affordable platform to manage students, teachers, attendance, timetables, and academic operations — built for schools of every size.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Acadify — School Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acadify — Modern School Management Platform",
    description:
      "Manage students, teachers, attendance, and timetables — all in one affordable platform.",
    images: ["/og-image.png"],
    creator: "@acadify",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://acadify.tech",
  },
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${poppins.variable} ${libreBaskerville.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
      >
        <SessionProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
