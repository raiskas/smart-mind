import { z } from 'zod';
import { financialAccountTypeValues, type FinancialAccountTypeValue } from '../constants/financial';

// Partes base do schema da conta financeira
const baseFinancialAccountSchemaParts = {
  name: z.string().min(1, { message: 'Account name is required.' }),
  account_type: z.enum(financialAccountTypeValues as [FinancialAccountTypeValue, ...FinancialAccountTypeValue[]], {
    errorMap: () => ({ message: 'Invalid account type.' }),
  }),
  initial_balance: z.coerce.number({
    invalid_type_error: 'Initial balance must be a number.',
    required_error: 'Initial balance is required.'
  }),
  currency_id: z.string().uuid({ message: 'Valid currency selection is required.' }),
  bank_name: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  card_network: z.string().optional().nullable(),
  card_last_four_digits: z.string().optional().nullable(),
  credit_limit: z.coerce.number().optional().nullable(),
  statement_closing_date: z.coerce.number().int().min(1).max(31).optional().nullable(),
  payment_due_date: z.coerce.number().int().min(1).max(31).optional().nullable(),
  description: z.string().optional().nullable(),
};

// Schema para criar conta financeira
export const CreateFinancialAccountSchema = z.object(baseFinancialAccountSchemaParts);

// Schema para atualizar conta financeira
export const UpdateFinancialAccountSchema = z.object({
  id: z.string().uuid(),
  ...baseFinancialAccountSchemaParts,
});

// Tipo para o estado do formulário das actions de conta financeira
// Este é o mesmo tipo que estava em app/[locale]/admin/management/financial-accounts/types.ts
// e foi importado em financialAccountActions.ts. Centralizando aqui.
export interface ActionFormState<T = any> {
  isSuccess: boolean;
  isError: boolean;
  message: string;
  data?: T | null;
  errors?: {
    [key: string]: string[] | undefined;
  } & {
    general?: string[];
  };
} 