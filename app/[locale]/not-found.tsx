import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { type Locale, defaultLocale, locales } from '@/i18n'; // Importar também defaultLocale e locales

type Props = {
  params?: { // Tornar params opcional
    locale?: string; // Tornar locale opcional
  };
};

export default async function NotFoundPage({ params }: Props) {
  // console.log('[NotFoundPage] Iniciando. Params recebidos:', params);
  
  let locale: Locale = defaultLocale;
  if (params?.locale && locales.includes(params.locale as Locale)) {
    locale = params.locale as Locale;
  } else {
    console.warn(`[NotFoundPage] Params.locale inválido ou ausente ('${params?.locale}'). Usando defaultLocale: '${defaultLocale}'`);
  }
  
  console.log(`[NotFoundPage] Usando locale: ${locale}`);
  console.log(`[NotFoundPage] Chamando setRequestLocale com: ${locale}`);
  setRequestLocale(locale);

  console.log(`[NotFoundPage] Tentando carregar traduções para namespace 'NotFoundPage' e locale: ${locale}`);
  try {
    const t = await getTranslations({ locale, namespace: 'NotFoundPage' });
    // console.log(`[NotFoundPage] Traduções carregadas. t('title') deve ser: ${t('title')}`);
    
    console.log('[NotFoundPage] Retornando JSX com traduções.');
    return (
      <div>
        <h1>{t('title')}</h1>
        <p>{t('description')}</p>
      </div>
    );
  } catch (error) {
      console.error(`[NotFoundPage] Erro ao carregar traduções para locale '${locale}':`, error);
      // Retornar um fallback simples sem traduções se getTranslations falhar
      return (
        <div>
          <h1>Page Not Found (Error Loading Translations)</h1>
          <p>Sorry, we encountered an error trying to display this page.</p>
        </div>
      );
  }
}

// Opcional: Adicionar metadados para a página 404
// import { Metadata } from 'next';
// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   const locale = params.locale as Locale;
//   const t = await getTranslations({ locale, namespace: 'NotFoundPage' });
//   return {
//     title: t('metaTitle'),
//   };
// } 