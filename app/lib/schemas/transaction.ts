import { z } from 'zod';
import {
  transactionStatusValues,
  transactionTypeValues,
} from '../constants/financial';

// Schema for a complete Transaction object (e.g., from database)
export const TransactionSchema = z.object({
  id: z.string().uuid({ message: 'ID de transação inválido.' }),
  company_id: z.string().uuid({ message: 'ID de empresa inválido.' }),
  financial_account_id: z.string().uuid({ message: 'ID de conta financeira inválido.' }),
  category_id: z.string().uuid({ message: 'ID de categoria inválido.' }).nullable(),
  currency_id: z.string().uuid({ message: 'ID de moeda inválido.' }), // References public.currencies.id
  type: z.enum(transactionTypeValues, { message: 'Tipo de transação inválido.' }),
  description: z.string(),
  amount: z.number({ message: 'O valor deve ser um número.' }),
  transaction_date: z.string().datetime({ message: 'Data da transação inválida.' }),
  due_date: z.string().datetime({ message: 'Data de vencimento inválida.' }).nullable(),
  payment_date: z.string().datetime({ message: 'Data de pagamento inválida.' }).nullable(),
  status: z.enum(transactionStatusValues, { message: 'Status da transação inválido.' }),
  payment_method: z.string().nullable(),
  document_number: z.string().nullable(),
  notes: z.string().nullable(),
  cost_center: z.string().nullable(),
  project: z.string().nullable(),
  created_by_user_id: z.string().uuid({ message: 'ID de usuário inválido.' }).nullable(),
  related_transaction_id: z.string().uuid({ message: 'ID de transação relacionada inválido.' }).nullable(),
  contact_id: z.string().uuid({ message: 'ID de contato inválido.' }).nullable(),
  attachment_url: z.string().url({ message: 'URL de anexo inválida.' }).nullable(),
  recurring_instance_id: z.string().uuid({ message: 'ID de instância recorrente inválido.' }).nullable(),
  created_at: z.string().datetime({ message: 'Data de criação inválida.' }),
  updated_at: z.string().datetime({ message: 'Data de atualização inválida.' }),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Schema for creating a new transaction
export const CreateTransactionSchema = z.object({
  financial_account_id: z.string().uuid({ message: 'Conta financeira é obrigatória.' }),
  category_id: z.string().uuid({ message: 'ID de categoria inválido.' }).nullable().optional(),
  currency_id: z.string().uuid({ message: 'Moeda é obrigatória.' }),
  type: z.enum(transactionTypeValues, { required_error: 'Tipo de transação é obrigatório.' }),
  description: z.string().trim().min(1, { message: 'Descrição é obrigatória.' }).max(255, { message: 'Descrição não pode exceder 255 caracteres.' }),
  amount: z.number({ required_error: 'Valor é obrigatório.' }).positive({ message: 'Valor deve ser positivo.' }),
  transaction_date: z.date({
    required_error: "Data da transação é obrigatória.",
    invalid_type_error: "Data da transação inválida.",
  }),
  due_date: z.string().datetime({ message: 'Data de vencimento inválida.' }).nullable().optional(),
  payment_date: z.string().datetime({ message: 'Data de pagamento inválida.' }).nullable().optional(),
  status: z.enum(transactionStatusValues, { required_error: 'Status é obrigatório.' }),
  payment_method: z.string().nullable().optional(),
  document_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  cost_center: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  // created_by_user_id will be set on the server
  related_transaction_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  attachment_url: z.string().url({ message: 'URL de anexo inválida.' }).nullable().optional(),
  // recurring_instance_id typically set by system if generated from recurring tx
});

export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;

// Schema for updating an existing transaction
export const UpdateTransactionSchema = z.object({
  id: z.string().uuid({ message: 'ID da transação inválido.' }), // Mantém o ID para consistência, mas pode ser omitido na action se passado separadamente
  description: z.string().trim().min(1, { message: 'Descrição é obrigatória.' }).max(255, { message: 'Descrição não pode exceder 255 caracteres.' }).optional(),
  amount: z.number({ invalid_type_error: 'Valor deve ser um número.' }).positive({ message: 'Valor deve ser positivo.' }).optional(),
  transaction_date: z.date({
    invalid_type_error: "Data da transação inválida.",
  }).optional(),
  type: z.enum(transactionTypeValues).optional(),
  status: z.enum(transactionStatusValues).optional(),
  financial_account_id: z.string().uuid({ message: "ID da conta financeira inválido." }).optional(),
  category_id: z.string().uuid({ message: "ID da categoria inválido." }).nullable().optional(),
  currency_id: z.string().uuid({ message: "ID da moeda inválido." }).optional(), // Adicionado, pois pode ser atualizado indiretamente ou diretamente
  payment_method: z.string().nullable().optional(),
  document_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  cost_center: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  related_transaction_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  attachment_url: z.string().url({ message: 'URL de anexo inválida.' }).nullable().optional(),
  recurring_instance_id: z.string().uuid().nullable().optional(),
});

export type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>; 