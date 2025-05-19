import "./globals.css"; // Corrigido para caminho relativo correto
import { Inter } from "next/font/google"; // Exemplo de fonte
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner"; // Assumindo que você usa sonner

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Smart Mind App", // Título padrão
  description: "Gerenciamento Inteligente", // Descrição padrão
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // A tag lang será definida no LocaleLayout
    <html suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
} 