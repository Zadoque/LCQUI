import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { DirtyFormsProvider } from "@/contexts/DirtyFormContext";
import { NotificacoesProvider } from "@/contexts/NotificacoesContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LCQUI — Laboratório de Controle de Qualidade e Instrumentação",
  description: "Gestão segura de reagentes, patrimônio, turmas e operações do LCQUI.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <NotificacoesProvider>
              <DirtyFormsProvider>
                {children}
              </DirtyFormsProvider>
            </NotificacoesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
