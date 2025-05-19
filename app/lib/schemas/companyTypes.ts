import { z } from 'zod';

// Schema Zod para criar uma empresa
export const CreateCompanySchema = z.object({
  name: z.string().min(1, { message: 'Company name is required.' }),
  officialName: z.string().optional(),
  taxId: z.string().optional(),
  defaultCurrencyId: z.string().uuid({ message: 'Valid currency selection is required.' }),
});

// Tipo para o estado do formulário de criação de empresa
export type CreateCompanyFormState = {
  message: string;
  fields?: Record<string, string>;
  errors?: z.ZodIssue[];
};

// Schema Zod para atualizar uma empresa
export const UpdateCompanySchema = CreateCompanySchema.extend({
  id: z.string().uuid(),
});

// Tipo geral para o estado do formulário em server actions compatível com useFormState
// Este tipo pode ser mais genérico e movido para um local de tipos globais se usado em outras actions.
export type ActionFormState = {
  success?: boolean; // undefined para inicial, true para success, false para error
  message: string;
  errors?: Record<string, string[] | undefined> | null; // Para erros específicos de campo
}; 