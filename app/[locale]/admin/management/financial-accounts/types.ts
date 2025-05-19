// Main types for Financial Accounts Management
import { FinancialAccountTypeValue as ImportedFinancialAccountTypeValue } from "../../../../lib/constants/financial";
import { Currency as ImportedCurrency } from "@/app/[locale]/admin/management/companies/types";
// Importar ActionFormState do local centralizado
import { type ActionFormState as ImportedActionFormState } from "../../../../lib/schemas/financialAccountTypes";

// Re-exportar os tipos importados para uso em outros arquivos deste módulo
export type FinancialAccountTypeValue = ImportedFinancialAccountTypeValue;
export type Currency = ImportedCurrency;
export type ActionFormState<T = any> = ImportedActionFormState<T>; // Reexportar o tipo centralizado

// Representa a estrutura da tabela financial_accounts
export interface FinancialAccount {
  id: string;
  company_id: string;
  name: string;
  account_type: FinancialAccountTypeValue;
  initial_balance: number;
  currency_id: string;
  bank_name?: string | null;
  account_number?: string | null;
  description?: string | null;
  card_network?: string | null;
  card_last_four_digits?: string | null;
  credit_limit?: number | null;
  statement_closing_date?: number | null; // Dia do mês (1-31)
  payment_due_date?: number | null; // Dia do mês (1-31)
  created_at: string;
  updated_at: string;
  // Campo calculado, não diretamente da tabela, mas útil para exibição
  current_balance?: number;
}

// Para exibir a conta com detalhes da moeda
export interface FinancialAccountWithCurrency extends FinancialAccount {
  currency_code?: string | null; // MODIFICADO: para ser opcional/nulável
  currency_name?: string | null; // MODIFICADO: para ser opcional/nulável
}

// Dados para o formulário de criação/edição de conta financeira
export type FinancialAccountFormData = Omit<FinancialAccount, "id" | "company_id" | "created_at" | "updated_at" | "current_balance"> & {
  id?: string; // Opcional para o caso de edição
};

// Dados que podem ser passados para o formulário de conta financeira
// Inclui a lista de moedas disponíveis
export interface FinancialAccountPageProps {
  currencies: Currency[];
  financialAccounts: FinancialAccountWithCurrency[];
  companyId: string;
}

// Interface para os dados que o FinancialAccountForm espera
export interface FinancialAccountFormProps {
  formAction: (payload: FormData) => void;
  initialState: ActionFormState;
  availableCurrencies: Currency[];
  companyId: string;
  financialAccountToEdit?: FinancialAccountFormData | null;
  closeModal: () => void;
  financialAccountTypes: { value: FinancialAccountTypeValue; label: string }[];
}

// Para a tabela de contas financeiras
export interface FinancialAccountTableProps {
  financialAccounts: FinancialAccountWithCurrency[];
  onEdit: (account: FinancialAccountWithCurrency) => void;
  deleteAction: (prevState: ActionFormState, formData: FormData) => Promise<ActionFormState>; // Agora usa o ActionFormState reexportado
  initialDeleteState: ActionFormState; // Agora usa o ActionFormState reexportado
} 