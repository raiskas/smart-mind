import { createNavigation } from 'next-intl/navigation';
import { locales, localePrefix, pathnames, defaultLocale } from '@/i18n'; // Importar config

// createNavigation espera um objeto com a configuração completa
export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  localePrefix,
  pathnames,
  defaultLocale // Adicionar defaultLocale também
}); 