import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server"; // Necessário para isAdmin
import { getCurrentUserContext } from '@/lib/auth/actions';
import { getTransactionCategoriesForCompany } from "@/app/actions/transactionCategoryActions";
// Caminho do componente cliente atualizado para refletir a nova estrutura de pastas
import TransactionCategoryManagementPageClient from "./components/TransactionCategoryManagementPageClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { isAdmin } from '@/lib/authUtils'; // Caminho corrigido para isAdmin

export default async function TransactionCategoriesPage() {
  const t = await getTranslations("admin.financials.categories"); 
  const tGlobal = await getTranslations("global");
  const supabase = createClient(); 

  const userIsAdmin = await isAdmin(supabase);
  const { companyId, userId } = await getCurrentUserContext(); 

  if (!userIsAdmin) { 
    return (
      <Alert variant="destructive" className="mt-4">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.accessDeniedTitle")}</AlertTitle>
        <AlertDescription>{tGlobal("errors.accessDeniedMessage")}</AlertDescription>
      </Alert>
    );
  }

  if (!companyId) {
    return (
      <Alert variant="destructive" className="mt-4">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.errorTitle")}</AlertTitle>
        <AlertDescription>{t("errorUserNotAssociatedWithCompany")}</AlertDescription> 
      </Alert>
    );
  }

  const categoriesResult = await getTransactionCategoriesForCompany(); 

  if (categoriesResult.isError || !categoriesResult.data) {
    return (
      <Alert variant="destructive" className="mt-4">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>{tGlobal("errors.errorTitle")}</AlertTitle>
        <AlertDescription>
          {categoriesResult.message || tGlobal("errors.generic")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TransactionCategoryManagementPageClient
      initialCategories={categoriesResult.data}
      companyId={companyId} 
    />
  );
} 