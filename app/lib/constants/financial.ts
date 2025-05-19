export const FINANCIAL_ACCOUNT_TYPES = [
  { value: 'CHECKING_ACCOUNT', labelKey: 'financialAccountTypes.checkingAccount' },
  { value: 'SAVINGS_ACCOUNT', labelKey: 'financialAccountTypes.savingsAccount' },
  { value: 'CASH', labelKey: 'financialAccountTypes.cash' },
  { value: 'CREDIT_CARD', labelKey: 'financialAccountTypes.creditCard' },
  { value: 'INVESTMENT', labelKey: 'financialAccountTypes.investment' },
  { value: 'OTHER', labelKey: 'financialAccountTypes.other' },
] as const; // 'as const' para inferir tipos literais mais estritos

export type FinancialAccountTypeValue = typeof FINANCIAL_ACCOUNT_TYPES[number]['value'];

// Helper para obter apenas os valores, útil para Zod enum
export const financialAccountTypeValues = FINANCIAL_ACCOUNT_TYPES.map(type => type.value);

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'BRL', label: 'BRL - Real Brasileiro' },
  // Adicionar outras moedas conforme necessário
] as const;

export const TRANSACTION_CATEGORY_TYPES_OPTIONS = [
  { value: 'income', label: 'Entrada' },
  { value: 'expense', label: 'Saída' },
] as const;

// O TRANSACTION_CATEGORY_TYPE_VALUES já está definido em app/lib/schemas/transactionCategory.ts
// e é exportado de lá, então não precisamos duplicá-lo aqui.
// Se for necessário em algum contexto onde não se queira importar o schema completo,
// podemos reconsiderar. Por ora, manter DRY. 

// Contact Types
export const CONTACT_TYPES = [
  { value: 'customer', labelKey: 'Common.ContactTypes.customer' },
  { value: 'supplier', labelKey: 'Common.ContactTypes.supplier' },
  { value: 'other', labelKey: 'Common.ContactTypes.other' },
] as const;

export type ContactTypeValue = typeof CONTACT_TYPES[number]['value'];
// Ensure the type is a non-empty array of string literals for z.enum
export const contactTypeValues = [
  CONTACT_TYPES[0].value,
  ...CONTACT_TYPES.slice(1).map(t => t.value)
] as const; // This ensures a non-empty tuple type if CONTACT_TYPES is not empty

// Transaction Statuses (Matches V1 CHECK constraint for transactions.status)
export const TRANSACTION_STATUSES = [
  { value: 'pending', labelKey: 'Common.TransactionStatuses.pending' },
  { value: 'paid', labelKey: 'Common.TransactionStatuses.paid' },
  { value: 'received', labelKey: 'Common.TransactionStatuses.received' },
  { value: 'overdue', labelKey: 'Common.TransactionStatuses.overdue' },
  { value: 'cancelled', labelKey: 'Common.TransactionStatuses.cancelled' },
  { value: 'scheduled', labelKey: 'Common.TransactionStatuses.scheduled' },
] as const;

export type TransactionStatusValue = typeof TRANSACTION_STATUSES[number]['value'];
export const transactionStatusValues = [
  TRANSACTION_STATUSES[0].value,
  ...TRANSACTION_STATUSES.slice(1).map(s => s.value)
] as const;

// Recurring Transaction Statuses (Matches V1 CHECK constraint for recurring_transactions.status)
export const RECURRING_TRANSACTION_STATUSES = [
  { value: 'active', labelKey: 'Common.RecurringTransactionStatuses.active' },
  { value: 'paused', labelKey: 'Common.RecurringTransactionStatuses.paused' },
  { value: 'finished', labelKey: 'Common.RecurringTransactionStatuses.finished' },
  // { value: 'cancelled', labelKey: 'Common.RecurringTransactionStatuses.cancelled' }, // Add if/when DB CHECK constraint is updated
] as const;

export type RecurringTransactionStatusValue = typeof RECURRING_TRANSACTION_STATUSES[number]['value'];
export const recurringTransactionStatusValues = [
  RECURRING_TRANSACTION_STATUSES[0].value,
  ...RECURRING_TRANSACTION_STATUSES.slice(1).map(s => s.value)
] as const;

// Transaction Types (Matches V1 CHECK constraint for transactions.type)
// Re-iterating TRANSACTION_CATEGORY_TYPES_OPTIONS from above but for general transaction type
// which also includes 'transfer'
export const TRANSACTION_TYPES = [
  { value: 'income', labelKey: 'Common.TransactionTypes.income' }, // Corresponds to TRANSACTION_CATEGORY_TYPES_OPTIONS
  { value: 'expense', labelKey: 'Common.TransactionTypes.expense' }, // Corresponds to TRANSACTION_CATEGORY_TYPES_OPTIONS
  { value: 'transfer', labelKey: 'Common.TransactionTypes.transfer' },
] as const;

export type TransactionTypeValue = typeof TRANSACTION_TYPES[number]['value'];
export const transactionTypeValues = [
  TRANSACTION_TYPES[0].value,
  ...TRANSACTION_TYPES.slice(1).map(t => t.value)
] as const;

// For TRANSACTION_CATEGORY_TYPES_OPTIONS, let's also export its values for schema usage
export const transactionCategoryTypeValues = [
  TRANSACTION_CATEGORY_TYPES_OPTIONS[0].value,
  ...TRANSACTION_CATEGORY_TYPES_OPTIONS.slice(1).map(t => t.value)
] as const;

// Export the type for a single value from TRANSACTION_CATEGORY_TYPES_OPTIONS
export type TransactionCategoryOptionValue = typeof TRANSACTION_CATEGORY_TYPES_OPTIONS[number]['value']; 