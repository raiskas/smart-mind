'use client';

import { useState } from 'react';
import { usePathname, useRouter } from '@/navigation'; // Corrigido o path da importação
import { useTransition } from 'react';
import { type Locale, locales } from '@/i18n';
import { useLocale, useTranslations } from 'next-intl'; // Importar useLocale e useTranslations
// useTranslations não é mais necessário aqui se não tivermos o label "Select Language"

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname(); // Este pathname já é o "canônico" (sem locale)
  const [isPending, startTransition] = useTransition();
  const currentLocale = useLocale(); // Correto: usando o hook
  const t = useTranslations('LanguageSwitcher'); // Hook para traduzir nomes dos idiomas

  function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    console.log(`[LangSwitcher] Tentando mudar para locale: ${nextLocale}`);
    console.log(`[LangSwitcher] Pathname canônico atual: ${pathname}`);
    startTransition(() => {
      // Passa o pathname canônico e o novo locale
      // Força a tipagem para any pois o tipo Pathname do next-intl é restritivo
      router.replace(pathname as any, { locale: nextLocale });
    });
  }

  return (
    <div className="relative">
      {/* Label visualmente oculto para acessibilidade */}
      <label htmlFor="language-select" className="sr-only">{t('selectLanguageLabel')}</label> {/* Label traduzido */}
      <select
        id="language-select"
        className={`inline-flex appearance-none bg-transparent py-2 pl-2 pr-8 text-sm rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        onChange={onSelectChange}
        value={currentLocale} 
        disabled={isPending}
      >
        {locales.map((cur) => (
          <option key={cur} value={cur}>
            {t(cur)} {/* Exibir nome do idioma traduzido, ex: t('pt-BR') */}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
         <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  );
} 