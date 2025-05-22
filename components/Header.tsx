import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin as checkIsAdmin } from '@/lib/authUtils'; // Renomeado para evitar conflito se houvesse var local
import { Link } from '@/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ClientLogoutButton } from '@/components/ClientLogoutButton';
import { Button } from '@/components/ui/button'; // Correção: case para Button minúsculo

export default async function Header() {
  const locale = await getLocale(); // Obter o locale atual para os Links
  const t = await getTranslations({ locale, namespace: 'Header' }); // t principal com namespace
  const tGlobal = await getTranslations({ locale }); // tGlobal sem namespace para teste
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userIsAdmin = false;
  if (user) {
    userIsAdmin = await checkIsAdmin(supabase);
  }

  return (
    <header className="bg-background shadow-md sticky top-0 z-50 border-b">
      <nav className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" locale={locale} className="text-xl font-bold text-foreground hover:text-primary transition-colors">
            {t('appName')}
          </Link>
          <div className="hidden sm:flex items-center space-x-3">
            <Link href="/" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('homeLink')}
            </Link>
            {user && (
              <Link href="/dashboard" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('dashboardLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/dashboard" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('adminDashboardLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/users" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('userManagementLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/roles" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('roleManagementLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/companies" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('companyManagementLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/financial-accounts" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('financialAccountsLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/financials/categories" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('transactionCategoriesLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/financials/transactions" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('transactionsLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/management/contacts" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('contactManagementLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/financials/payables" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {t('payablesLink')}
              </Link>
            )}
            {user && userIsAdmin && (
              <Link href="/admin/financials/receivables" locale={locale} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {tGlobal('Header.receivablesLink')} {/* Teste com tGlobal e chave completa */}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <ClientLogoutButton />
          ) : (
            <a href={`/${locale}/login`} >
              <Button variant="outline" size="sm">
                {t('loginLink')}
              </Button>
            </a>
          )}
        </div>
      </nav>
    </header>
  );
} 