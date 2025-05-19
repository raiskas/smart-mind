import { getTranslations } from 'next-intl/server';
import { getCompaniesAction } from '../../../../actions/companyActions';
import { getCurrenciesAction } from '../../../../actions/currencyActions';
import CompanyManagementPageClient from './CompanyManagementPageClient'; // Reverted to no extension
import { AlertDialog, AlertDialogDescription, AlertDialogTitle } from '../../../../../components/ui/alert-dialog';
import { Terminal } from 'lucide-react';

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
  const t = await getTranslations('Admin.CompanyManagement'); // Namespace for translations
  const tError = await getTranslations('Errors');

  const companiesResult = await getCompaniesAction();
  const currenciesResult = await getCurrenciesAction();

  if (companiesResult.error || currenciesResult.error) {
    const errorMessage = companiesResult.error || currenciesResult.error || tError('genericError');
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

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">{t('pageTitle')}</h1>
      <CompanyManagementPageClient 
        initialCompanies={initialCompanies} 
        currencies={currencies} 
      />
    </div>
  );
} 