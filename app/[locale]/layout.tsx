// app/[locale]/layout.tsx (Simplificado, com logs)
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales, type Locale } from "@/i18n"; // i18n.ts exporta 'locales' e 'Locale'
import { getMessages, setRequestLocale } from 'next-intl/server'; // Usar getMessages daqui
import Header from '@/components/Header';
// Remova imports não utilizados como 'getMessages' de 'next-intl/server' se não for mais necessário

// Se você tiver um arquivo globals.css, importe-o aqui
// import '../globals.css'; 

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

// Adicione aqui imports que você precisa GLOBALMENTE para todas as páginas,
// como fontes, CSS global, ThemeProvider, Header, Toaster, etc.
// Exemplo:
// import { Inter } from "next/font/google";
// import "../globals.css";
// import { ThemeProvider } from "@/components/ThemeProvider";
// import Header from '@/components/Header';
// import { Toaster } from 'sonner';
// const inter = Inter({ subsets: ["latin"] });

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = params.locale as Locale;
  setRequestLocale(locale);

  if (!locales.includes(locale)) {
    notFound();
  }

  let messages;
  try {
    messages = await getMessages(); 
    if (!messages) {
        // Pode-se logar um erro mais discreto aqui se desejado, ou confiar no notFound abaixo
        console.error(`[LocaleLayout SERVER] Critical: getMessages() returned null/undefined for locale: ${locale}.`);
        throw new Error("Failed to load messages via getMessages().");
    }
  } catch (error) {
    console.error(`[LocaleLayout SERVER] Critical error loading messages for locale ${locale}:`, error);
    notFound(); 
  }
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}> 
      {/* ThemeProvider e Toaster já estão no RootLayout, então não precisam ser repetidos aqui 
          a menos que você queira um contexto de tema/notificação específico para este layout de locale.
          Normalmente, Header e main content são suficientes. 
      */}
      <Header />
      <main className="flex-grow p-6"> {/* Adicionado algum padding à main */}
        {children}
      </main>
    </NextIntlClientProvider>
  );
} 