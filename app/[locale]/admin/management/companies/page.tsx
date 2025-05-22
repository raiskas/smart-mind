import { getTranslations } from 'next-intl/server';
import { getCompaniesAction } from '../../../../actions/companyActions';
import { getCurrenciesAction } from '../../../../actions/currencyActions';
import CompanyManagementPageClient from './CompanyManagementPageClient'; // Reverted to no extension
// import { AlertDialog, AlertDialogDescription, AlertDialogTitle } from '../../../../../components/ui/alert-dialog'; // AlertDialog não está sendo usado diretamente aqui
import { Terminal } from 'lucide-react'; // Usado no bloco de erro original
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../../../../components/ui/alert"; // Mantido se Alert for usado, mas o original usava div
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"; // Mantido se Alert for usado

// Define a type for the company data expected by the client component
// This should ideally come from your database types or be more specific
// For now, using a basic structure based on what getCompaniesAction returns
export type CompanyData = {
  id: string;
  name: string;
  official_name?: string | null;
  tax_id?: string | null;
  default_currency_id?: string | null;
  created_at: string;
  updated_at: string;
  // TODO: Add related currency data if fetched/joined in getCompaniesAction
};

export type CurrencyData = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
};

type CompanyManagementPageProps = {
  params: {
    locale: string;
  };
};

export default async function CompanyManagementPage({ params: { locale } }: CompanyManagementPageProps) {
  const t = await getTranslations('Admin.CompanyManagement');
  const tError = await getTranslations('Errors');
  const tGlobal = await getTranslations('global');

  const companiesResult = await getCompaniesAction();
  const currenciesResult = await getCurrenciesAction();

  if (companiesResult.error || currenciesResult.error) {
    const errorMessage = companiesResult.error || currenciesResult.error || tGlobal('errors.generic');
    // Revertendo para a estrutura de erro original desta página, que não usava Card/Alert
    return (
      <div className="container mx-auto py-10">
        <div className="p-4 border border-red-500 rounded-md bg-red-50 text-red-700">
          <div className="flex">
            <Terminal className="h-4 w-4 mr-2 flex-shrink-0" />
            <h3 className="font-semibold">{tError('fetchErrorTitle')}</h3>
          </div>
          <p className="text-sm">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Ensure data is not null/undefined before passing, provide empty array as fallback
  const initialCompanies: CompanyData[] = companiesResult.companies || [];
  const currencies: CurrencyData[] = currenciesResult.currencies || [];

  // Revertendo para a estrutura original: container > h1 > ClientComponent
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('pageTitle')}</CardTitle>
          <CardDescription>{t('pageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyManagementPageClient 
            initialCompanies={initialCompanies} 
            currencies={currencies} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 