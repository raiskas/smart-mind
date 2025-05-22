'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServiceRoleClient } from '@/lib/supabase/service'; // Assuming this path is correct
// import { Database } from '@/types/database.types'; // TODO: Generate and uncomment this for strong types
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  type CreateCompanyFormState,
  type ActionFormState
} from '../lib/schemas/companyTypes';

export async function createCompanyAction(
  prevState: CreateCompanyFormState,
  formData: FormData
): Promise<CreateCompanyFormState> {
  const supabase = getServiceRoleClient();

  const validatedFields = CreateCompanySchema.safeParse({
    name: formData.get('name'),
    officialName: formData.get('officialName'),
    taxId: formData.get('taxId'),
    defaultCurrencyId: formData.get('defaultCurrencyId'),
  });

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Invalid form data. Please correct the errors and try again.',
      errors: validatedFields.error.issues as z.ZodIssue[],
    };
  }

  const { name, officialName, taxId, defaultCurrencyId } = validatedFields.data;

  try {
    // Check if company with the same name already exists
    const { data: existingCompany, error: selectError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116: "Searched for a single row, but multiple rows were found"
      console.error('Error checking for existing company:', selectError);
      return { message: `Database error: ${selectError.message}` };
    }

    if (existingCompany) {
      return {
        message: 'A company with this name already exists.',
        errors: [{ path: ['name'], message: 'Company name already in use.' } as z.ZodIssue],
      };
    }

    const { error: insertError } = await supabase.from('companies').insert({
      name,
      official_name: officialName,
      tax_id: taxId,
      default_currency_id: defaultCurrencyId,
    });

    if (insertError) {
      console.error('Error inserting company:', insertError);
      return { message: `Failed to create company: ${insertError.message}` };
    }

    revalidatePath('/admin/management/companies'); // Adjust path if necessary
    revalidatePath('/admin/management/users'); // Revalidate users page as company might be assigned
    return { message: 'Company created successfully.' };

  } catch (e: any) {
    console.error('Unexpected error in createCompanyAction:', e);
    return { message: `An unexpected error occurred: ${e.message}` };
  }
}

// TODO: Implement getCompaniesAction, getCompanyByIdAction, updateCompanyAction, deleteCompanyAction

export async function getCompaniesAction() {
  const supabase = getServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*') // Select all columns for now, adjust as needed
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching companies:', error);
      return { error: `Database error: ${error.message}`, companies: [] };
    }
    return { companies: data || [] };
  } catch (e: any) {
    console.error('Unexpected error in getCompaniesAction:', e);
    return { error: `An unexpected error occurred: ${e.message}`, companies: [] };
  }
}

export async function getCompanyByIdAction(id: string) {
  if (!id) return { error: 'Company ID is required.', company: null };
  const supabase = getServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*') // Select all columns
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching company by ID (${id}):`, error);
      return { error: `Database error: ${error.message}`, company: null };
    }
    return { company: data };
  } catch (e: any) {
    console.error('Unexpected error in getCompanyByIdAction:', e);
    return { error: `An unexpected error occurred: ${e.message}`, company: null };
  }
}

export async function updateCompanyAction(
  prevState: CreateCompanyFormState, // Can reuse the same state type for now
  formData: FormData
): Promise<CreateCompanyFormState> {
  const supabase = getServiceRoleClient();

  const validatedFields = UpdateCompanySchema.safeParse({
    id: formData.get('id'), // Ensure your form sends the company ID
    name: formData.get('name'),
    officialName: formData.get('officialName'),
    taxId: formData.get('taxId'),
    defaultCurrencyId: formData.get('defaultCurrencyId'),
  });

  if (!validatedFields.success) {
    console.error('Validation Error (Update):', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Invalid form data for update. Please correct the errors.',
      errors: validatedFields.error.issues as z.ZodIssue[],
    };
  }

  const { id, name, officialName, taxId, defaultCurrencyId } = validatedFields.data;

  try {
    // Check if another company (excluding the current one) has the same name
    const { data: existingCompany, error: selectError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name)
      .neq('id', id) // Exclude the current company from the check
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking for existing company name (Update):', selectError);
      return { message: `Database error: ${selectError.message}` };
    }

    if (existingCompany) {
      return {
        message: 'Another company with this name already exists.',
        errors: [{ path: ['name'], message: 'Company name already in use by another company.' } as z.ZodIssue],
      };
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        name,
        official_name: officialName,
        tax_id: taxId,
        default_currency_id: defaultCurrencyId,
        updated_at: new Date().toISOString(), // Manually set updated_at if not handled by trigger in update
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating company:', updateError);
      return { message: `Failed to update company: ${updateError.message}` };
    }

    revalidatePath('/admin/management/companies');
    revalidatePath(`/admin/management/companies/edit/${id}`); // If you have an edit page per ID
    revalidatePath('/admin/management/users');
    return { message: 'Company updated successfully.' };

  } catch (e: any) {
    console.error('Unexpected error in updateCompanyAction:', e);
    return { message: `An unexpected error occurred: ${e.message}` };
  }
}

export async function deleteCompanyAction(
  prevState: ActionFormState, // Previous state, not actively used in this simple delete action
  formData: FormData
): Promise<ActionFormState> {
  const id = formData.get('id');

  if (!id || typeof id !== 'string') {
    return { success: false, message: 'ID da empresa inválido ou ausente.' };
  }
  const supabase = getServiceRoleClient();

  try {
    // Check if any user is associated with this company
    const { data: associatedUsers, error: usersCheckError, count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }) // Use head:true for count only
        .eq('company_id', id);

    if (usersCheckError) {
        console.error('Error checking for users associated with company:', usersCheckError);
        return { success: false, message: `Erro de banco de dados ao verificar usuários: ${usersCheckError.message}` };
    }

    // 'count' will contain the number of associated users
    if (count !== null && count > 0) {
        return { success: false, message: `Não é possível excluir a empresa: ${count} usuário(s) associado(s).` };
    }
    
    // Proceed with deletion if no users are associated
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting company:', deleteError);
      return { success: false, message: `Falha ao excluir empresa: ${deleteError.message}` };
    }

    revalidatePath('/admin/management/companies');
    revalidatePath('/admin/management/users'); // Users might be affected if their company view changes
    return { success: true, message: 'Empresa excluída com sucesso.' };

  } catch (e: any) {
    console.error('Unexpected error in deleteCompanyAction:', e);
    return { success: false, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
} 