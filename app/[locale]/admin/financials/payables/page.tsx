import { getTranslations } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PayablesPageClient } from './components/PayablesPageClient';
import { getTransactionsForCompany, type TransactionWithRelatedData, type GetTransactionsResponse } from '@/app/actions/transactionActions';
// Não precisamos mais do DisplayTransaction aqui
// import { type Transaction as DisplayTransaction } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionsTable';

interface PayablesPageServerProps {
  searchParams?: {
    page?: string;
    pageSize?: string;
    searchTerm?: string;
    // outros searchParams se necessário
  };
}

export default async function PayablesPage({ searchParams }: PayablesPageServerProps) {
  const t = await getTranslations('Financials.PayablesPage');

  const currentPage = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams?.pageSize ? parseInt(searchParams.pageSize, 10) : 10;
  const searchTerm = searchParams?.searchTerm;

  let initialPayablesData: TransactionWithRelatedData[] = [];
  let totalCountData = 0;
  let totalAmountFilteredData = 0;
  let errorLoadingData: string | null = null;

  try {
    const result = await getTransactionsForCompany({
      page: currentPage,
      pageSize: pageSize,
      description: searchTerm,
      type: 'expense',
      status: ['pending', 'overdue'],
      sortBy: 'transaction_date',
      sortDirection: 'asc'
    });

    if (result.isSuccess && result.data) {
      const responsePayload: GetTransactionsResponse = result.data;
      initialPayablesData = responsePayload.data;
      totalCountData = responsePayload.pagination.totalCount;
      totalAmountFilteredData = responsePayload.totalAmountFiltered || 0;
    } else {
      errorLoadingData = result.message || t('errorLoadingPayables');
    }
  } catch (e: any) {
    console.error('Error fetching payables in Page:', e);
    errorLoadingData = e.message || t('errorLoadingPayables');
  }

  if (errorLoadingData) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{errorLoadingData}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <PayablesPageClient 
            initialPayables={initialPayablesData}
            totalCount={totalCountData}
            totalAmountFiltered={totalAmountFilteredData}
          />
        </CardContent>
      </Card>
    </div>
  );
} 