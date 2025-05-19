import { z } from 'zod';
import { contactTypeValues } from '../constants/financial';

// Schema for a complete Contact object (e.g., from database)
export const ContactSchema = z.object({
  id: z.string().uuid({ message: 'ID inválido.' }),
  company_id: z.string().uuid({ message: 'ID de empresa inválido.' }),
  name: z.string(),
  email: z.string().email({ message: 'Formato de email inválido.' }).nullable(),
  phone: z.string().nullable(),
  type: z.enum(contactTypeValues, {
    errorMap: (issue, ctx) => {
      if (issue.code === 'invalid_enum_value') {
        return { message: 'Tipo de contato inválido.' };
      }
      return { message: ctx.defaultError };
    },
  }),
  created_at: z.string().datetime({ message: 'Data de criação inválida.' }),
  updated_at: z.string().datetime({ message: 'Data de atualização inválida.' }),
});

export type Contact = z.infer<typeof ContactSchema>;

// Schema for creating a new contact (data from client-side form)
export const CreateContactSchema = z.object({
  name: z.string().min(1, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Formato de email inválido.' }).nullable().optional(), // Optional and can be null
  phone: z.string().nullable().optional(), // Optional and can be null
  type: z.enum(contactTypeValues, {
    required_error: 'O tipo de contato é obrigatório.',
    invalid_type_error: 'Tipo de contato inválido.',
  }),
});

export type CreateContact = z.infer<typeof CreateContactSchema>;

// Schema for updating an existing contact (data from client-side form, all fields optional)
export const UpdateContactSchema = CreateContactSchema.partial();

export type UpdateContact = z.infer<typeof UpdateContactSchema>; 