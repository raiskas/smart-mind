import { getTranslations } from "next-intl/server";
import { getFinancialAccountsForCompany } from "@/app/actions/financialAccountActions";
import { getCurrenciesAction } from "@/app/actions/currencyActions"; 
import FinancialAccountManagementPageClient from "./FinancialAccountManagementPageClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"; 
import { getCurrentUserContext } from "@/lib/auth/actions"; 
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function FinancialAccountsPage() {
  const tPage = await getTranslations("admin.financials.management.financialAccounts");
  const tGlobal = await getTranslations("global");

  const { companyId, userId } = await getCurrentUserContext();

  if (!companyId) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.errorTitle")}</AlertTitle>
        <AlertDescription>
          {tPage("errorUserNotAssociatedWithCompany")}
        </AlertDescription>
      </Alert>
    );
  }

  const [accountsResult, currenciesResult] = await Promise.all([
    getFinancialAccountsForCompany(),
    getCurrenciesAction(),
  ]);

  if (!accountsResult.isSuccess || currenciesResult.error) {
    const errorMessage = accountsResult.message || currenciesResult.error || tGlobal("errors.generic");
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.errorTitle")}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  const financialAccounts = accountsResult.data || [];
  const currencies = currenciesResult.currencies || [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{tPage('title')}</CardTitle>
          <CardDescription>{tPage('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialAccountManagementPageClient
            initialFinancialAccounts={financialAccounts}
            availableCurrencies={currencies}
            companyId={companyId}
          />
        </CardContent>
      </Card>
    </div>
  );
} 