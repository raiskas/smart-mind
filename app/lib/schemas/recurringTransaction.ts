import { z } from 'zod';
import {
  recurringTransactionStatusValues,
  transactionCategoryTypeValues, // Used for base_transaction_type (income/expense)
} from '../constants/financial';

// Schema for a complete RecurringTransaction object (e.g., from database)
export const RecurringTransactionSchema = z.object({
  id: z.string().uuid({ message: 'ID de transação recorrente inválido.' }),
  company_id: z.string().uuid({ message: 'ID de empresa inválido.' }),
  description: z.string(),
  base_transaction_type: z.enum(transactionCategoryTypeValues, { // 'income' or 'expense'
    message: 'Tipo base da transação inválido (deve ser entrada ou saída).',
  }),
  financial_account_id: z.string().uuid({ message: 'ID de conta financeira inválido.' }),
  category_id: z.string().uuid({ message: 'ID de categoria inválido.' }).nullable(),
  currency_id: z.string().uuid({ message: 'ID de moeda inválido.' }),
  base_amount: z.number({ message: 'O valor base deve ser um número.' }),
  recurrence_rule: z.string({ message: 'Regra de recorrência é obrigatória.' }), // e.g., RRULE string
  start_date: z.string().datetime({ message: 'Data de início inválida.' }),
  end_date: z.string().datetime({ message: 'Data de término inválida.' }).nullable(),
  next_due_date: z.string().datetime({ message: 'Próxima data de vencimento inválida.' }).nullable(),
  status: z.enum(recurringTransactionStatusValues, { message: 'Status da transação recorrente inválido.' }),
  auto_create_transaction: z.boolean().default(false),
  days_before_due_to_create: z.number().int().nonnegative().default(0),
  cost_center: z.string().nullable(),
  project: z.string().nullable(),
  notes: z.string().nullable(),
  contact_id: z.string().uuid({ message: 'ID de contato inválido.' }).nullable(),
  created_at: z.string().datetime({ message: 'Data de criação inválida.' }),
  updated_at: z.string().datetime({ message: 'Data de atualização inválida.' }),
});

export type RecurringTransaction = z.infer<typeof RecurringTransactionSchema>;

// Schema for creating a new recurring transaction
export const CreateRecurringTransactionSchema = z.object({
  description: z.string().min(1, { message: 'Descrição é obrigatória.' }),
  base_transaction_type: z.enum(transactionCategoryTypeValues, {
    required_error: 'Tipo base da transação é obrigatório.',
  }),
  financial_account_id: z.string().uuid({ message: 'Conta financeira é obrigatória.' }),
  category_id: z.string().uuid().nullable().optional(),
  currency_id: z.string().uuid({ message: 'Moeda é obrigatória.' }),
  base_amount: z.number({
    required_error: 'Valor base é obrigatório.',
    invalid_type_error: 'Valor base deve ser um número.',
  }),
  recurrence_rule: z.string().min(1, { message: 'Regra de recorrência é obrigatória.' }),
  start_date: z.string().datetime({ message: 'Data de início inválida.' }),
  end_date: z.string().datetime().nullable().optional(),
  status: z.enum(recurringTransactionStatusValues, { 
    required_error: 'Status é obrigatório.' 
  }).default('active'), // Default to active
  auto_create_transaction: z.boolean().default(false).optional(),
  days_before_due_to_create: z.number().int().nonnegative().default(0).optional(),
  cost_center: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  // company_id, next_due_date, created_at, updated_at will be handled server-side or by DB
});

export type CreateRecurringTransaction = z.infer<typeof CreateRecurringTransactionSchema>;

// Schema for updating an existing recurring transaction
export const UpdateRecurringTransactionSchema = CreateRecurringTransactionSchema.partial().extend({
  id: z.string().uuid() // ID is required for updates
});

export type UpdateRecurringTransaction = z.infer<typeof UpdateRecurringTransactionSchema>; 