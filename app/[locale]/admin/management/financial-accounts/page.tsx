import { getTranslations } from "next-intl/server";
import { getFinancialAccountsForCompany } from "@/app/actions/financialAccountActions";
import { getCurrenciesAction } from "@/app/actions/currencyActions"; 
import FinancialAccountManagementPageClient from "./FinancialAccountManagementPageClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"; 
import { getCurrentUserContext } from "@/lib/auth/actions"; 

export default async function FinancialAccountsPage() {
  const t = await getTranslations("admin.management.financialAccounts");
  const tGlobal = await getTranslations("global");

  const { companyId, userId } = await getCurrentUserContext();

  if (!companyId) {
    // TODO: Re-enable Alert component when available
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.errorTitle")}</AlertTitle>
        <AlertDescription>
          {t("errorUserNotAssociatedWithCompany")}
        </AlertDescription>
      </Alert>
    );
  }

  // Fetching data in parallel
  const [accountsResult, currenciesResult] = await Promise.all([
    getFinancialAccountsForCompany(),
    getCurrenciesAction(),
  ]);

  if (!accountsResult.isSuccess || currenciesResult.error) {
    const errorMessage = accountsResult.message || currenciesResult.error || tGlobal("errors.generic");
    // TODO: Re-enable Alert component when available
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.errorTitle")}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  // Assegurar que os dados não são nulos/undefined antes de passar para o cliente
  const financialAccounts = accountsResult.data || [];
  const currencies = currenciesResult.currencies || [];

  return (
    <FinancialAccountManagementPageClient
      initialFinancialAccounts={financialAccounts}
      availableCurrencies={currencies}
      companyId={companyId}
    />
  );
} 