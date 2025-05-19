'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServiceRoleClient } from '@/lib/supabase/service';
// createClient é usado por getCurrentUserContext, que será importado
// import { Database } from '@/types/database.types'; 
import {
  CreateFinancialAccountSchema,
  UpdateFinancialAccountSchema,
  type ActionFormState // ActionFormState é específica para formulários e useFormState
} from '../lib/schemas/financialAccountTypes';

// UserContext e getCurrentUserContext serão importados
import { getCurrentUserContext } from '@/lib/auth/actions';
import type { UserContext } from '@/lib/types/actions'; // Importar UserContext
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ActionResponse } from '@/lib/types/actions';

// Tipo base para campos editáveis do formulário (sem ID, pois ID não é parte da "criação")
export type EditableFinancialAccountFields = z.infer<typeof CreateFinancialAccountSchema>;

// Tipo para conta financeira como existe no BD (incluindo campos de auditoria e ID)
export type FinancialAccountFromDB = EditableFinancialAccountFields & {
  id: string; 
  company_id: string;
  created_at: string;
  updated_at: string;
  // Adicione aqui outros campos que vêm do BD por um select '*' e não estão em CreateFinancialAccountSchema
};

// Antiga definição, pode ser necessária para compatibilidade ou para schemas de atualização
// onde o ID é parte do schema Zod.
export type FinancialAccount = z.infer<typeof UpdateFinancialAccountSchema>;

// Nova definição para FinancialAccountWithCurrency usando FinancialAccountFromDB
// Esta será usada como tipo de retorno para getFinancialAccountsForCompany e getFinancialAccountByIdAction
export type FinancialAccountWithCurrency = FinancialAccountFromDB & {
  currency_code?: string | null;
  currency_name?: string | null;
  currencies?: { id: string; code: string; name: string; } | null; 
};

// Importar o tipo FinancialAccountOption do modal
import type { FinancialAccountOption } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionFormModal';

// Interface auxiliar para tipar o retorno da query do Supabase para contas
interface AccountDataFromSupabase {
  id: string;
  name: string;
  currency_id: string; 
  currencies: Array<{ // Supabase pode retornar um array aqui, mesmo para FK
    id: string; 
    code: string;
  }> | null; // O array pode ser nulo ou vazio
}

export async function createFinancialAccountAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  console.log('[CreateFA Action] Iniciada. prevState:', prevState);
  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) { 
    const errorState = { isSuccess: false, isError: true, message: 'User not associated with a company or not authenticated.' };
    console.log('[CreateFA Action] Retornando Erro (no companyId):', errorState);
    return errorState;
  }
  
  const rawFormData = Object.fromEntries(formData.entries());
  console.log('[CreateFA Action] Raw FormData:', JSON.stringify(rawFormData, null, 2));

  const validatedFields = CreateFinancialAccountSchema.safeParse(rawFormData);
  console.log('[CreateFA Action] Validated Fields:', JSON.stringify(validatedFields, null, 2));

  if (!validatedFields.success) {
    console.error('Validation Error (CreateFA):', validatedFields.error.flatten().fieldErrors);
    const errorState = {
      isSuccess: false,
      isError: true,
      message: 'Invalid form data. Please correct the errors and try again.',
      errors: validatedFields.error.flatten().fieldErrors as any,
    };
    console.log('[CreateFA Action] Retornando Erro (validation failed):', errorState);
    return errorState;
  }

  const dataToInsert = {
    ...validatedFields.data,
    company_id: companyId,
  };
  console.log('[CreateFA Action] Data to Insert:', JSON.stringify(dataToInsert, null, 2));

  try {
    const { error: insertError } = await supabase.from('financial_accounts').insert(dataToInsert);

    if (insertError) {
      console.error('Error inserting financial account:', insertError);
      const errorState = { isSuccess: false, isError: true, message: `Failed to create financial account: ${insertError.message}` };
      console.log('[CreateFA Action] Retornando Erro (insert failed):', errorState);
      return errorState;
    }

    revalidatePath('/[locale]/admin/management/financial-accounts');
    const successState = { isSuccess: true, isError: false, message: 'Financial account created successfully.' };
    console.log('[CreateFA Action] Retornando Sucesso:', successState);
    return successState;

  } catch (err: any) {
    console.error('Unexpected error in createFinancialAccountAction:', err);
    const errorState = { isSuccess: false, isError: true, message: `An unexpected error occurred: ${err.message}` };
    console.log('[CreateFA Action] Retornando Erro (catch):', errorState);
    return errorState;
  }
}

export async function getFinancialAccountsForCompany(
  pageParam?: number,
  pageSizeParam?: number
): Promise<ActionResponse<FinancialAccountWithCurrency[]>> {
  const supabase = getServiceRoleClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    console.warn('getFinancialAccountsForCompany: Company ID could not be determined from user context.');
    return { 
      isSuccess: false,
      isError: true,
      message: 'Company ID could not be determined from user context.', 
      data: [] 
    };
  }

  const page = pageParam || 1;
  const pageSize = pageSizeParam || DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    const { data, error, count } = await supabase
      .from('financial_accounts')
      .select(
        `
        *,
        currencies (id, code, name)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching financial accounts:', error);
      return { 
        isSuccess: false, 
        isError: true, 
        message: `Database error: ${error.message}`, 
        data: [] 
      };
    }
    
    const accountsWithCurrency: FinancialAccountWithCurrency[] = data?.map(acc => ({
        ...acc,
        currency_code: acc.currencies?.code,
        currency_name: acc.currencies?.name,
    })) || [];
    
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return { 
      isSuccess: true, 
      isError: false, 
      data: accountsWithCurrency,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
      }
    };

  } catch (err: any) {
    console.error('Unexpected error in getFinancialAccountsForCompany:', err);
    return { 
      isSuccess: false, 
      isError: true, 
      message: `An unexpected error occurred: ${err.message}`, 
      data: [] 
    };
  }
}

export async function getFinancialAccountByIdAction(accountId: string, companyIdFromProps?: string | null) {
  let companyIdToUse = companyIdFromProps;
  if (!companyIdToUse) {
    const { companyId: companyIdToUseFromContext } = await getCurrentUserContext();
    if (!companyIdToUse) { companyIdToUse = companyIdToUseFromContext; }
  }

  if (!companyIdToUse) {
    return { error: 'User not associated with a company or not authenticated.', data: null };
  }
  if (!accountId || typeof accountId !== 'string' || !accountId.trim()) {
     return { error: 'Financial Account ID is required.', data: null };
  }

  const supabase = getServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select(`
        *,
        currencies (id, code, name)
      `)
      .eq('id', accountId)
      .eq('company_id', companyIdToUse)
      .single();

    if (error) {
      console.error(`Error fetching financial account by ID (${accountId}):`, error);
      return { error: `Database error: ${error.message}`, data: null };
    }
    const accountWithCurrency = data ? {
        ...data,
        currency_code: data.currencies?.code,
        currency_name: data.currencies?.name,
    } : null;
    return { data: accountWithCurrency, error: null };
  } catch (err: any) {
    console.error('Unexpected error in getFinancialAccountByIdAction:', err);
    return { error: `An unexpected error occurred: ${err.message}`, data: null };
  }
}

export async function updateFinancialAccountAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'User not associated with a company or not authenticated.' };
  }

  const rawId = formData.get('id');
  if (typeof rawId !== 'string' || !rawId) {
    return { isSuccess: false, isError: true, message: 'Account ID is missing or invalid for update.' };
  }
  
  const rawFormData = Object.fromEntries(formData.entries());

  const validatedFields = UpdateFinancialAccountSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation Error (UpdateFA):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Invalid form data for update. Please correct the errors.',
      errors: validatedFields.error.flatten().fieldErrors as any,
    };
  }

  const { id, ...updateData } = validatedFields.data;

  try {
    const { data: existingAccount, error: fetchError } = await supabase
      .from('financial_accounts')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchError) {
      console.error(`Error fetching account ${id} for update check:`, fetchError);
      return { isSuccess: false, isError: true, message: `Error verifying account for update: ${fetchError.message}` };
    }
    if (!existingAccount) {
      return { isSuccess: false, isError: true, message: 'Account not found or does not belong to your company.' };
    }

    const { error: updateError } = await supabase
      .from('financial_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId); 

    if (updateError) {
      console.error('Error updating financial account:', updateError);
      return { isSuccess: false, isError: true, message: `Failed to update financial account: ${updateError.message}` };
    }

    revalidatePath('/[locale]/admin/management/financial-accounts');
    return { isSuccess: true, isError: false, message: 'Financial account updated successfully.' };

  } catch (err: any) {
    console.error('Unexpected error in updateFinancialAccountAction:', err);
    return { isSuccess: false, isError: true, message: `An unexpected error occurred: ${err.message}` };
  }
}

export async function deleteFinancialAccountAction(
  prevState: ActionFormState, 
  formData: FormData
): Promise<ActionFormState> {
  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'User not associated with a company or not authenticated.' };
  }

  const id = formData.get('id');

  if (!id || typeof id !== 'string') {
    return { isSuccess: false, isError: true, message: 'Account ID is invalid or missing.' };
  }

  try {
    const { data: account, error: fetchError } = await supabase
      .from('financial_accounts')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchError) {
      return { isSuccess: false, isError: true, message: `Error verifying account for deletion: ${fetchError.message}` };
    }
    if (!account) {
      return { isSuccess: false, isError: true, message: 'Account not found or does not belong to your company.' };
    }

    const { error: deleteError } = await supabase
      .from('financial_accounts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); 

    if (deleteError) {
      console.error('Error deleting financial account:', deleteError);
      return { isSuccess: false, isError: true, message: `Failed to delete financial account: ${deleteError.message}` };
    }

    revalidatePath('/[locale]/admin/management/financial-accounts');
    return { isSuccess: true, isError: false, message: 'Financial account deleted successfully.' };

  } catch (err: any) {
    console.error('Unexpected error in deleteFinancialAccountAction:', err);
    return { isSuccess: false, isError: true, message: `An unexpected error occurred: ${err.message}` };
  }
}

export async function getFinancialAccountsForSelectAction(): Promise<ActionResponse<FinancialAccountOption[]>> {
  const supabase = getServiceRoleClient();
  const { companyId, userId } = await getCurrentUserContext();

  if (!companyId || !userId) {
    console.warn('getFinancialAccountsForSelectAction: Company ID or User ID could not be determined.');
    return {
      isSuccess: false,
      isError: true,
      message: 'User not authenticated or not associated with a company.',
      data: [],
    };
  }

  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id, name, currency_id, currencies (id, code)') // Selecionar currency_id da própria conta e o código da moeda
      .eq('company_id', companyId)
      // .eq('is_active', true) // Adicionar se houver campo is_active e for relevante
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching financial accounts for select:', error);
      return {
        isSuccess: false,
        isError: true,
        message: `Database error: ${error.message}`,
        data: [],
      };
    }

    // Aplicar type assertion para ajudar o TypeScript
    const typedData = data as AccountDataFromSupabase[] | null;

    const options: FinancialAccountOption[] = typedData?.map(acc => ({
      value: acc.id,
      label: `${acc.name} (${acc.currencies?.[0]?.code || 'N/A'})`, // Acessar o primeiro item do array
      currency_id: acc.currency_id, 
      currency_code: acc.currencies?.[0]?.code || '', // Acessar o primeiro item do array
    })) || [];

    return {
      isSuccess: true,
      isError: false,
      data: options,
    };

  } catch (err: any) {
    console.error('Unexpected error in getFinancialAccountsForSelectAction:', err);
    return {
      isSuccess: false,
      isError: true,
      message: `An unexpected error occurred: ${err.message}`,
      data: [],
    };
  }
} 