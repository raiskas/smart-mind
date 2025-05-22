'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  CreateContactSchema,
  CreateContactFormData,
  UpdateContactSchema,
  UpdateContactFormData,
  Contact,
  ContactListItem,
  ContactForSelect,
  ContactSchema
} from '@/lib/schemas/contact';
import { getCurrentUserContext } from '@/lib/authUtils';

// Helper para tratamento de erros
interface ActionResult<T = null> {
  isSuccess: boolean;
  message?: string;
  data?: T;
  errors?: z.ZodIssue[];
}

// --- CREATE CONTACT ---
export async function createContactAction(
  formData: CreateContactFormData
): Promise<ActionResult<Contact>> {
  try {
    const { userId, companyId, error: userContextError } = await getCurrentUserContext();
    if (userContextError || !userId || !companyId) {
      return { isSuccess: false, message: userContextError?.message || 'user_not_authenticated_or_no_company' };
    }

    const validation = CreateContactSchema.safeParse(formData);
    if (!validation.success) {
      return { isSuccess: false, message: 'invalid_form_data', errors: validation.error.errors };
    }

    const supabase = createClient();
    const contactDataToInsert = { ...validation.data, company_id: companyId };

    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert(contactDataToInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return { isSuccess: false, message: error.message || 'error_creating_contact' };
    }

    revalidatePath('/admin/management/contacts');
    return { isSuccess: true, data: newContact as Contact, message: 'contact_created_successfully' };

  } catch (e: any) {
    console.error('Unexpected error in createContactAction:', e);
    return { isSuccess: false, message: e.message || 'unexpected_error' };
  }
}

// --- GET CONTACTS FOR COMPANY (Paginated) ---
interface GetContactsParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getContactsForCompanyAction(
  params: GetContactsParams = {}
): Promise<ActionResult<{ contacts: ContactListItem[]; totalCount: number }>> {
  try {
    const { companyId, error: userContextError } = await getCurrentUserContext();
    if (userContextError || !companyId) {
      return { isSuccess: false, message: userContextError?.message || 'user_not_authenticated_or_no_company' };
    }

    const supabase = createClient();
    const { page = 1, pageSize = 10, searchTerm, sortBy = 'name', sortOrder = 'asc' } = params;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('contacts')
      .select('id, name, alias_name, type, email, phone_number, is_active', { count: 'exact' })
      .eq('company_id', companyId);

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,alias_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return { isSuccess: false, message: error.message || 'error_fetching_contacts' };
    }

    return {
      isSuccess: true,
      data: { contacts: data as ContactListItem[], totalCount: count || 0 },
    };

  } catch (e: any) {
    console.error('Unexpected error in getContactsForCompanyAction:', e);
    return { isSuccess: false, message: e.message || 'unexpected_error' };
  }
}

// --- GET CONTACT BY ID ---
export async function getContactByIdAction(id: string): Promise<ActionResult<Contact>> {
  try {
    const { companyId, error: userContextError } = await getCurrentUserContext();
    if (userContextError || !companyId) {
      return { isSuccess: false, message: userContextError?.message || 'user_not_authenticated_or_no_company' };
    }
    if (!id) return { isSuccess: false, message: 'contact_id_required' };

    const supabase = createClient();
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching contact by ID:', error);
      if (error.code === 'PGRST116') {
        return { isSuccess: false, message: 'contact_not_found' };
      }
      return { isSuccess: false, message: error.message || 'error_fetching_contact' };
    }
    return { isSuccess: true, data: contact as Contact };

  } catch (e: any) {
    console.error('Unexpected error in getContactByIdAction:', e);
    return { isSuccess: false, message: e.message || 'unexpected_error' };
  }
}

// --- UPDATE CONTACT ---
export async function updateContactAction(
  id: string,
  formData: UpdateContactFormData
): Promise<ActionResult<Contact>> {
  try {
    const { companyId, error: userContextError } = await getCurrentUserContext();
    if (userContextError || !companyId) {
      return { isSuccess: false, message: userContextError?.message || 'user_not_authenticated_or_no_company' };
    }

    const validation = UpdateContactSchema.safeParse(formData);
    if (!validation.success) {
      return { isSuccess: false, message: 'invalid_form_data', errors: validation.error.errors };
    }
    if (validation.data.id !== id) {
        return { isSuccess: false, message: 'contact_id_mismatch' };
    }

    const supabase = createClient();
    
    const { id: validatedId, ...updatePayload } = validation.data;

    const { data: updatedContact, error } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return { isSuccess: false, message: error.message || 'error_updating_contact' };
    }

    revalidatePath('/admin/management/contacts');
    revalidatePath(`/admin/management/contacts/${id}`);
    return { isSuccess: true, data: updatedContact as Contact, message: 'contact_updated_successfully' };

  } catch (e: any) {
    console.error('Unexpected error in updateContactAction:', e);
    return { isSuccess: false, message: e.message || 'unexpected_error' };
  }
}

// --- DELETE CONTACT ---
export async function deleteContactAction(id: string): Promise<ActionResult> {
  try {
    const { companyId, error: userContextError } = await getCurrentUserContext();
    if (userContextError || !companyId) {
      return { isSuccess: false, message: userContextError?.message || 'user_not_authenticated_or_no_company' };
    }
    if (!id) return { isSuccess: false, message: 'contact_id_required' };

    const supabase = createClient();
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting contact:', error);
      return { isSuccess: false, message: error.message || 'error_deleting_contact' };
    }

    revalidatePath('/admin/management/contacts');
    return { isSuccess: true, message: 'contact_deleted_successfully' };

  } catch (e: any) {
    console.error('Unexpected error in deleteContactAction:', e);
    return { isSuccess: false, message: e.message || 'unexpected_error' };
  }
}

// --- GET CONTACTS FOR SELECT ---
export async function getContactsForSelectAction(): Promise<ActionResult<ContactForSelect[]>> {
  try {
    const { companyId, error: userContextError } = await getCurrentUserContext();
    if (userContextError || !companyId) {
      return { isSuccess: false, message: userContextError?.message || 'user_not_authenticated_or_no_company' };
    }

    const supabase = createClient();
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, name, alias_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching contacts for select:', error);
      return { isSuccess: false, message: error.message || 'error_fetching_contacts_for_select' };
    }
    if (!contacts) {
        return { isSuccess: true, data: [] };
    }

    const formattedContacts = contacts.map(c => ({
      value: c.id,
      label: c.alias_name ? `${c.name} (${c.alias_name})` : c.name,
    }));

    return { isSuccess: true, data: formattedContacts };

  } catch (e: any) {
    console.error('Unexpected error in getContactsForSelectAction:', e);
    return { isSuccess: false, message: e.message || 'unexpected_error' };
  }
} 