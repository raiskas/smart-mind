import { getTranslations } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/navigation';
import { getDashboardSummaryAction, getUpcomingItemsAction } from '@/app/actions/dashboardActions';
import type { DashboardSummaryData, UpcomingItemsData } from '@/app/actions/dashboardActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

// TODO: Importar componentes filhos do dashboard
// Exemplo: import { SummaryCard } from './components/SummaryCard';
// Exemplo: import { UpcomingItemsList } from './components/UpcomingItemsList';
// Exemplo: import { QuickActions } from './components/QuickActions';

export default async function AdminDashboardPage() {
  const t = await getTranslations('AdminDashboardPage');
  const tShared = await getTranslations('Shared.buttons');
  const tGlobalErrors = await getTranslations('global.errors'); // For error messages

  const summaryResult = await getDashboardSummaryAction();
  const upcomingItemsResult = await getUpcomingItemsAction(); // Default limit is 5

  let summaryData: DashboardSummaryData | null = null;
  if (summaryResult.isSuccess && summaryResult.data) {
    summaryData = summaryResult.data;
  } else {
    console.error("Failed to fetch dashboard summary:", summaryResult.message);
    // Display a global error or log, main content might still render with upcoming items
  }

  let upcomingItemsData: UpcomingItemsData | null = null;
  if (upcomingItemsResult.isSuccess && upcomingItemsResult.data) {
    upcomingItemsData = upcomingItemsResult.data;
  } else {
    console.error("Failed to fetch upcoming items:", upcomingItemsResult.message);
  }
  
  // Default data structure to avoid errors if API calls fail or return no data
  const displaySummary = summaryData || {
    totalPayables: 0,
    totalReceivables: 0,
    consolidatedBalance: 0,
    monthlyTransactionsCount: 0,
  };

  const displayUpcomingPayables = upcomingItemsData?.upcomingPayables || [];
  const displayUpcomingReceivables = upcomingItemsData?.upcomingReceivables || [];

  const quickActions = [
    { label: tShared('create'), href: '/admin/management/financials/transactions?action=new', variant: 'default' as const },
    { label: t('quickActions.manageTransactions'), href: '/admin/management/financials/transactions', variant: 'outline' as const },
    { label: t('quickActions.managePayables'), href: '/admin/financials/payables', variant: 'outline' as const },
    { label: t('quickActions.manageReceivables'), href: '/admin/financials/receivables', variant: 'outline' as const },
    { label: t('quickActions.manageFinancialAccounts'), href: '/admin/management/financial-accounts', variant: 'outline' as const },
  ];

  // Helper to format currency - TODO: make this more robust, consider i18n for currency symbols/formats
  const formatCurrency = (value: number, currencyCode: string = 'BRL') => {
    // Simple BRL formatting, extend for other currencies or use Intl.NumberFormat
    if (currencyCode === 'BRL') {
      return `R$ ${value.toFixed(2)}`;
    }
    return `${currencyCode} ${value.toFixed(2)}`;
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      {/* Error Display Area */}
      {!summaryResult.isSuccess && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>{tGlobalErrors('fetchDataErrorTitle', { item: 'dashboard summary' })}</AlertTitle>
          <AlertDescription>
            {summaryResult.message || tGlobalErrors('genericFetchErrorDetails')}
          </AlertDescription>
        </Alert>
      )}
      {!upcomingItemsResult.isSuccess && (
         <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>{tGlobalErrors('fetchDataErrorTitle', { item: 'upcoming items' })}</AlertTitle>
          <AlertDescription>
            {upcomingItemsResult.message || tGlobalErrors('genericFetchErrorDetails')}
          </AlertDescription>
        </Alert>
      )}

      {/* Seção de KPIs */}
      {summaryResult.isSuccess && summaryData && ( // Only render if summary data is successfully fetched
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">{t('kpiSectionTitle')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('kpis.totalPayables')}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* TODO: Handle multi-currency. This assumes a single currency or direct sum. */}
                <div className="text-2xl font-bold">{formatCurrency(displaySummary.totalPayables)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('kpis.totalReceivables')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(displaySummary.totalReceivables)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('kpis.consolidatedBalance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(displaySummary.consolidatedBalance)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('kpis.monthlyTransactions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{displaySummary.monthlyTransactionsCount}</div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Seção de Ações Rápidas */}
      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">{t('quickActionsSectionTitle')}</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href as any} passHref>
              <Button variant={action.variant}>{action.label}</Button>
            </Link>
          ))}
        </div>
      </section>
      
      {/* TODO: Seção de Próximos Vencimentos/Recebimentos */}
      {/* This section should be un-commented and implemented with UpcomingItemsList component */}
      {upcomingItemsResult.isSuccess && upcomingItemsData && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">{t('upcomingSectionTitle')}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold mb-3">{t('upcomingPayablesTitle')}</h3>
              {displayUpcomingPayables.length > 0 ? (
                <ul className="space-y-3">
                  {displayUpcomingPayables.map(item => (
                    <li key={item.id} className="p-3 bg-card rounded-md shadow">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.description}</span>
                        <span className="text-sm text-muted-foreground">{new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-lg font-semibold text-destructive">
                        {formatCurrency(item.amount, item.currencyCode)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t('noUpcomingPayables')}</p>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">{t('upcomingReceivablesTitle')}</h3>
              {displayUpcomingReceivables.length > 0 ? (
                <ul className="space-y-3">
                  {displayUpcomingReceivables.map(item => (
                    <li key={item.id} className="p-3 bg-card rounded-md shadow">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.description}</span>
                        <span className="text-sm text-muted-foreground">{new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-lg font-semibold text-green-600"> {/* Use a different color for receivables */}
                        {formatCurrency(item.amount, item.currencyCode)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t('noUpcomingReceivables')}</p>
              )}
            </div>
          </div>
        </section>
      )}
      {/* <UpcomingItemsList payables={displayUpcomingPayables} receivables={displayUpcomingReceivables} /> */}


      <p className="text-sm text-muted-foreground">
        {t('dataDisclaimer')}
      </p>
    </div>
  );
} 