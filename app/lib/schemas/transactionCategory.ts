import { z } from 'zod';

export const TRANSACTION_CATEGORY_TYPE_VALUES = ['income', 'expense'] as const;

export interface TransactionCategory {
  id: string;
  name: string;
  type: (typeof TRANSACTION_CATEGORY_TYPE_VALUES)[number];
  description?: string | null;
  company_id: string;
  is_active: boolean;
  parent_category_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const CreateTransactionCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  type: z.enum(TRANSACTION_CATEGORY_TYPE_VALUES, {
    errorMap: () => ({ message: 'Tipo de categoria inválido' }),
  }),
  description: z.string().max(255, 'Descrição deve ter no máximo 255 caracteres').optional().nullable(),
  // parent_category_id será lidado separadamente se implementarmos hierarquia no futuro
});

export type CreateTransactionCategoryPayload = z.infer<typeof CreateTransactionCategorySchema>;

export const UpdateTransactionCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  type: z.enum(TRANSACTION_CATEGORY_TYPE_VALUES, {
    errorMap: () => ({ message: 'Tipo de categoria inválido' }),
  }).optional(),
  description: z.string().max(255, 'Descrição deve ter no máximo 255 caracteres').optional().nullable(),
  is_active: z.boolean().optional(),
  // parent_category_id será lidado separadamente se implementarmos hierarquia no futuro
});

export type UpdateTransactionCategoryPayload = z.infer<typeof UpdateTransactionCategorySchema>; 