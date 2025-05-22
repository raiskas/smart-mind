import { getTranslations } from 'next-intl/server';
import TransactionManagementClient from './components/TransactionManagementClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Ajuste o caminho se necessário

// Removido setRequestLocale daqui, pois o layout raiz já o define.
// O locale é implicitamente passado para getTranslations pelo middleware.

export default async function TransactionsPage() {
  const t = await getTranslations('Financials.TransactionsPage');

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('manageTransactionsTitle')}</CardTitle>
          <CardDescription>{t('manageTransactionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionManagementClient />
        </CardContent>
      </Card>
    </div>
  );
} 