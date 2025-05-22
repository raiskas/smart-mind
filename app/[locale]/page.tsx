// Arquivo temporariamente desabilitado para depuração de rota 404
// export default function LocaleHome() {
//   return <div>Home do locale</div>;
// }

// export function Home() {
//   const t = useTranslations('HomePage');

//   return (
//     <main className="flex min-h-screen flex-col items-center justify-between p-24">
//       <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
//         <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
//           {t('getStarted')}&nbsp;
//           {/* O path correto agora seria app/[locale]/page.tsx */}
//           <code className="font-mono font-bold">app/[locale]/page.tsx</code> 
//         </p>
//         <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
//           <ThemeToggle />
//         </div>
//       </div>

//       <div className="relative z-[-1] flex place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
//         <h1 className="text-4xl font-bold text-center">{t('welcomeTitle')}</h1>
//       </div>

//       <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
//         <ClientTestButton /> {/* Usamos o novo componente aqui */}
//        
//         {/* Você pode adicionar mais conteúdo ou componentes aqui */}
//       </div>
//     </main>
//   );
// } 

import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server'; // Necessário se usar getTranslations diretamente
import { type Locale, locales, defaultLocale } from '@/i18n';
import HomePageClientContent from '@/components/HomePageClientContent';

// Esta é a página raiz para um locale específico (ex: /pt-BR)

// Se você precisar buscar dados do servidor aqui (ex: verificar se usuário está logado)
// use uma função async e getTranslations/setRequestLocale como abaixo.
// export default async function LocaleRootPage({ params: { locale } }: { params: { locale: Locale } }) {
//   setRequestLocale(locale); // Define o locale para buscar traduções do servidor
//   const t = await getTranslations('HomePage');

// Para um componente cliente simples:
export default function LocaleRootPage({ params: { locale } }: { params: { locale: Locale } }) {
  // Nota: useTranslations funciona em Server Components (sem 'use client') desde next-intl 3. 
  // Se precisar de interatividade, adicione 'use client'.
  const t = useTranslations('HomePage'); // Usar namespace HomePage das suas traduções

  // Validar locale (opcional, layout já faz isso)
  if (!locales.includes(locale)) {
     // Pode chamar notFound() aqui também ou deixar o layout tratar
     return null; 
  }

  return (
    <main>
      {/* Conteúdo do Server Component, se houver */}
      {/* <h1>{t('title')}</h1> */}
      <HomePageClientContent />
    </main>
  );
} 