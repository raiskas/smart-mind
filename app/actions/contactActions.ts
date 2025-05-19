'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server'; // Usado para getContactsForCompany, getContactById
import {
  CreateContactSchema,
  UpdateContactSchema,
  type Contact,
} from '@/lib/schemas/contact';
import { getCurrentUserContext } from '@/lib/auth/actions'; // Importar de @/lib/auth/actions
import type { ActionResponse } from '@/lib/types/actions'; // Importar de @/lib/types/actions
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ContactTypeValue } from '@/lib/constants/financial';

// ActionResponse e UserContext não são mais definidos localmente

export async function createContactAction(rawData: unknown): Promise<ActionResponse<Contact>> {
  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId || !userId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa, não autenticado ou ID de usuário não encontrado.',
    };
  }

  const validatedFields = CreateContactSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error('Validation Error (CreateContact):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados do formulário inválidos. Por favor, corrija os erros.',
      errors: validatedFields.error.errors,
    };
  }

  const contactData = {
    ...validatedFields.data,
    company_id: companyId,
    // created_by_user_id: userId, // Adicionar se a tabela contacts tiver esta coluna
  };

  try {
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting contact:', insertError);
      return { isSuccess: false, isError: true, message: `Falha ao criar contato: ${insertError.message}` };
    }

    revalidatePath('/admin/financials/contacts'); // Ajustar o path conforme necessário

    return {
      isSuccess: true,
      isError: false,
      message: 'Contato criado com sucesso.',
      data: newContact,
    };

  } catch (e: any) {
    console.error('Unexpected error in createContactAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
}

// Placeholder for other actions
// export async function updateContactAction(...) { ... }
// export async function deleteContactAction(...) { ... }

export interface GetContactsParams {
  name?: string;
  email?: string;
  phone?: string;
  type?: ContactTypeValue;
  page?: number;
  pageSize?: number;
}

export async function getContactsForCompany(
  params?: GetContactsParams
): Promise<ActionResponse<Contact[]>> {
  const supabase = createClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa.',
      data: [],
    };
  }

  const page = params?.page || 1;
  const pageSize = params?.pageSize || DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    // Aplicar filtros opcionais
    if (params?.name) {
      query = query.ilike('name', `%${params.name}%`);
    }
    if (params?.email) {
      query = query.ilike('email', `%${params.email}%`);
    }
    if (params?.phone) {
      query = query.ilike('phone', `%${params.phone}%`);
    }
    if (params?.type) {
      query = query.eq('type', params.type);
    }
    
    query = query.order('name', { ascending: true }).range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar contatos: ${error.message}`, data: [] };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      isSuccess: true, 
      isError: false, 
      data: data || [],
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
      }
    };

  } catch (e: any) {
    console.error('Unexpected error in getContactsForCompany:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: [] };
  }
}

export async function getContactById(id: string): Promise<ActionResponse<Contact | null>> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID do contato é obrigatório.', data: null };
  }
  
  const supabase = createClient();
  const { userId, companyId } = await getCurrentUserContext(); // Updated call

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.', data: null };
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId) // Ensure the contact belongs to the user's company
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // "Searched for a single row, but 0 rows were found"
        return { isSuccess: false, isError: true, message: 'Contato não encontrado.', data: null };
      }
      console.error(`Error fetching contact by ID (${id}):`, error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar contato: ${error.message}`, data: null };
    }
    return { isSuccess: true, isError: false, data: data };

  } catch (e: any) {
    console.error('Unexpected error in getContactById:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: null };
  }
}

export async function updateContactAction(
  id: string,
  rawData: unknown
): Promise<ActionResponse<Contact>> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID do contato é obrigatório para atualização.' };
  }

  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext(); // Updated call

  if (!companyId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa ou não autenticado.',
    };
  }

  const validatedFields = UpdateContactSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error('Validation Error (UpdateContact):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados do formulário inválidos para atualização. Por favor, corrija os erros.',
      errors: validatedFields.error.errors,
    };
  }

  const updateData = validatedFields.data;

  try {
    // First, verify the contact exists and belongs to the company
    const { data: existingContactCheck, error: checkError } = await supabase
      .from('contacts')
      .select('id, name, type')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return { isSuccess: false, isError: true, message: 'Contato não encontrado para atualização.' };
      }
      console.error('Error checking contact for update:', checkError);
      return { isSuccess: false, isError: true, message: `Erro no banco de dados: ${checkError.message}` };
    }

    // If name or type are being changed, check for potential unique constraint violation
    if ((updateData.name && updateData.name !== existingContactCheck.name) || 
        (updateData.type && updateData.type !== existingContactCheck.type)) {
      const newName = updateData.name || existingContactCheck.name;
      const newType = updateData.type || existingContactCheck.type;
      
      const { data: duplicateCheck, error: duplicateError } = await supabase
        .from('contacts')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', newName)
        .eq('type', newType)
        .neq('id', id) // Exclude the current contact itself from the check
        .maybeSingle();

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        console.error('Error checking for duplicate contact name/type on update:', duplicateError);
        return { isSuccess: false, isError: true, message: `Erro no banco de dados: ${duplicateError.message}` };
      }

      if (duplicateCheck) {
        return {
          isSuccess: false,
          isError: true,
          message: 'Já existe outro contato com este nome e tipo para sua empresa.',
        };
      }
    }

    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
      })
      .eq('id', id)
      .eq('company_id', companyId) // Ensure RLS or direct check confines update to company
      .select()
      .single();

    if (updateError) {
      console.error('Error updating contact:', updateError);
      // Check for unique constraint violation error (though we try to pre-check)
      if (updateError.code === '23505') { // PostgreSQL unique_violation error code
         return { isSuccess: false, isError: true, message: 'Já existe um contato com este nome e tipo.' };
      }
      return { isSuccess: false, isError: true, message: `Falha ao atualizar contato: ${updateError.message}` };
    }

    revalidatePath('/admin/financials/contacts'); // Adjust as needed
    revalidatePath(`/admin/financials/contacts/${id}`); // If there's a specific page for viewing/editing a contact

    return {
      isSuccess: true,
      isError: false,
      message: 'Contato atualizado com sucesso.',
      data: updatedContact,
    };

  } catch (e: any) {
    console.error('Unexpected error in updateContactAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
}

export async function deleteContactAction(id: string): Promise<ActionResponse> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID do contato é obrigatório para exclusão.' };
  }

  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext(); // Updated call

  if (!companyId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa ou não autenticado.',
    };
  }

  try {
    // Optional: Verify the contact exists and belongs to the company before deleting
    // This adds an extra DB call but ensures we don't try to delete non-existent/unauthorized data.
    const { data: contactToDelete, error: checkError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError || !contactToDelete) {
      if (checkError && checkError.code === 'PGRST116') {
        return { isSuccess: false, isError: true, message: 'Contato não encontrado para exclusão.' };  
      }
      console.error('Error checking contact for deletion or contact not found:', checkError);
      return { isSuccess: false, isError: true, message: 'Contato não encontrado ou não pertence à sua empresa.' };
    }
    
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); // Redundant if RLS is perfect, but good for service role client safety

    if (deleteError) {
      console.error('Error deleting contact:', deleteError);
      return { isSuccess: false, isError: true, message: `Falha ao excluir contato: ${deleteError.message}` };
    }

    revalidatePath('/admin/financials/contacts'); // Adjust as needed

    return { isSuccess: true, isError: false, message: 'Contato excluído com sucesso.' };

  } catch (e: any) {
    console.error('Unexpected error in deleteContactAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
} 