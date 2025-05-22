import { z } from 'zod';

// Helper para garantir que os valores do enum correspondam aos CHECK constraints do DB
export const CONTACT_TYPES = ['customer', 'supplier', 'employee', 'other'] as const;
export const DOCUMENT_TYPES = ['CPF', 'CNPJ', 'PASSPORT', 'OTHER'] as const;

const ContactTypeEnum = z.enum(CONTACT_TYPES);
const DocumentTypeEnum = z.enum(DOCUMENT_TYPES);

export const BaseContactSchema = z.object({
  name: z.string().min(2, { message: 'contact_form_name_too_short' }), // Corresponds to name in DB
  alias_name: z.string().optional().nullable(), // Corresponds to alias_name in DB
  type: ContactTypeEnum, // Corresponds to type in DB
  document_type: DocumentTypeEnum.optional().nullable(), // Corresponds to document_type in DB
  document_number: z.string().trim().optional().nullable().refine(
    (val) => val === null || val === undefined || val === '' || val.length > 0,
    { message: 'Document number cannot be empty if provided' }
  ), // Corresponds to document_number in DB
  email: z.string().email({ message: 'contact_form_invalid_email' }).optional().nullable().or(z.literal('')), // Corresponds to email in DB
  phone_number: z.string().optional().nullable(), // Corresponds to phone_number in DB
  mobile_phone_number: z.string().optional().nullable(), // Corresponds to mobile_phone_number in DB
  address_street: z.string().optional().nullable(),
  address_number: z.string().optional().nullable(),
  address_complement: z.string().optional().nullable(),
  address_neighborhood: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip_code: z.string().optional().nullable(),
  address_country: z.string().default('Brasil').optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  // company_id será adicionado nas server actions, não vem do formulário diretamente
});

export type BaseContactFormData = z.infer<typeof BaseContactSchema>;

// Schema para criar um novo contato
export const CreateContactSchema = BaseContactSchema;
export type CreateContactFormData = BaseContactFormData;

// Schema para atualizar um contato existente
export const UpdateContactSchema = BaseContactSchema.extend({
  id: z.string().uuid({ message: 'contact_form_invalid_id' }),
});
export type UpdateContactFormData = z.infer<typeof UpdateContactSchema>;

// Schema para um objeto Contact completo (ex: retornado do banco de dados)
export const ContactSchema = BaseContactSchema.extend({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  created_at: z.string(), // Supabase retorna como string ISO
  updated_at: z.string(), // Supabase retorna como string ISO
});
export type Contact = z.infer<typeof ContactSchema>;

// Schema para os dados de listagem (pode ser um subconjunto de Contact)
export const ContactListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  alias_name: z.string().nullable(),
  type: ContactTypeEnum,
  email: z.string().nullable(),
  phone_number: z.string().nullable(),
  is_active: z.boolean(),
  // Adicione outros campos conforme necessário para a tabela de listagem
});
export type ContactListItem = z.infer<typeof ContactListItemSchema>;

// Para uso em selects, por exemplo
export type ContactForSelect = {
  value: string; // id do contato
  label: string; // name ou outra representação textual do contato
}; 