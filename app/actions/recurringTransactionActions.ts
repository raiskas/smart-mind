'use server';

import { z, ZodError } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';
import {
  CreateRecurringTransactionSchema,
  UpdateRecurringTransactionSchema,
  type RecurringTransaction,
} from '@/lib/schemas/recurringTransaction';
import { getCurrentUserContext } from '@/lib/auth/actions';
import type { ActionResponse } from '@/lib/types/actions';
import type {
  RecurringTransactionStatusValue,
  TransactionCategoryOptionValue,
} from '@/lib/constants/financial';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Tipos para dados relacionados
export type RecurringTransactionWithRelatedData = RecurringTransaction & {
  financial_accounts?: { name: string | null } | null;
  transaction_categories?: { name: string | null } | null;
  contacts?: { name: string | null } | null;
  currencies?: { code: string | null } | null;
  financial_account_name?: string | null;
  category_name?: string | null;
  contact_name?: string | null;
  currency_code?: string | null;
};

export async function createRecurringTransactionAction(
  rawData: unknown
): Promise<ActionResponse<RecurringTransaction>> {
  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId || !userId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa, não autenticado ou ID de usuário não encontrado.',
    };
  }

  const validatedFields = CreateRecurringTransactionSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error('Validation Error (CreateRecurringTransaction):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados do formulário inválidos. Por favor, corrija os erros.',
      errors: validatedFields.error.errors,
    };
  }

  const { start_date, ...restOfValidatedData } = validatedFields.data;

  const transactionData = {
    ...restOfValidatedData,
    start_date,
    next_due_date: start_date,
    company_id: companyId,
  };

  try {
    const { data: newRecTx, error: insertError } = await supabase
      .from('recurring_transactions')
      .insert(transactionData)
      .select('*')
      .single() as PostgrestSingleResponse<RecurringTransaction>;

    if (insertError) {
      console.error('Error inserting recurring transaction:', insertError);
      return { isSuccess: false, isError: true, message: `Falha ao criar transação recorrente: ${insertError.message}` };
    }

    revalidatePath('/admin/financials/recurring-transactions');

    return {
      isSuccess: true,
      isError: false,
      message: 'Transação recorrente criada com sucesso.',
      data: newRecTx,
    };

  } catch (e: any) {
    if (e instanceof ZodError) {
      return { isSuccess: false, isError: true, message: 'Erro de validação Zod.', errors: e.errors };
    }
    console.error('Unexpected error in createRecurringTransactionAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
}

export interface RecurringTransactionFilters {
  status?: RecurringTransactionStatusValue;
  baseTransactionType?: TransactionCategoryOptionValue;
  financialAccountId?: string;
  categoryId?: string;
  contactId?: string;
  description?: string;
  minBaseAmount?: number;
  maxBaseAmount?: number;
  nextDueDateFrom?: string;
  nextDueDateTo?: string;
  sortBy?: 'next_due_date' | 'base_amount' | 'description' | 'start_date';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getRecurringTransactionsForCompany(
  filters?: RecurringTransactionFilters
): Promise<ActionResponse<RecurringTransactionWithRelatedData[]>> {
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

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    let queryBuilder = supabase
      .from('recurring_transactions')
      .select(
        '*, ' +
        'financial_accounts (name), ' +
        'transaction_categories (name), ' +
        'contacts (name), ' +
        'currencies (code)',
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.baseTransactionType) {
      queryBuilder = queryBuilder.eq('base_transaction_type', filters.baseTransactionType);
    }
    if (filters?.financialAccountId) {
      queryBuilder = queryBuilder.eq('financial_account_id', filters.financialAccountId);
    }
    if (filters?.categoryId) {
      queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
    }
    if (filters?.contactId) {
      queryBuilder = queryBuilder.eq('contact_id', filters.contactId);
    }
    if (filters?.description) {
      queryBuilder = queryBuilder.ilike('description', `%${filters.description}%`);
    }
    if (filters?.minBaseAmount !== undefined) {
      queryBuilder = queryBuilder.gte('base_amount', filters.minBaseAmount);
    }
    if (filters?.maxBaseAmount !== undefined) {
      queryBuilder = queryBuilder.lte('base_amount', filters.maxBaseAmount);
    }
    if (filters?.nextDueDateFrom) {
      queryBuilder = queryBuilder.gte('next_due_date', filters.nextDueDateFrom);
    }
    if (filters?.nextDueDateTo) {
      queryBuilder = queryBuilder.lte('next_due_date', filters.nextDueDateTo);
    }

    const sortBy = filters?.sortBy || 'next_due_date';
    const sortDirection = filters?.sortDirection || 'asc';
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortDirection === 'asc' });
    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

    const { data, error, count } = await queryBuilder as PostgrestResponse<RecurringTransactionWithRelatedData> & { count: number | null };

    if (error) {
      console.error('Error fetching recurring transactions:', error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar transações recorrentes: ${error.message}`, data: [] };
    }

    const responseData: RecurringTransactionWithRelatedData[] = data?.map((rt: RecurringTransactionWithRelatedData) => ({
      ...rt,
      financial_account_name: rt.financial_accounts?.name,
      category_name: rt.transaction_categories?.name,
      contact_name: rt.contacts?.name,
      currency_code: rt.currencies?.code,
    })) || [];

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return { 
      isSuccess: true, 
      isError: false, 
      data: responseData,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
      }
    };

  } catch (e: any) {
    console.error('Unexpected error in getRecurringTransactionsForCompany:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: [] };
  }
}

export async function getRecurringTransactionById(id: string): Promise<ActionResponse<RecurringTransactionWithRelatedData | null>> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID da transação recorrente é obrigatório.', data: null };
  }

  const supabase = createClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.', data: null };
  }

  try {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(
        '*, ' +
        'financial_accounts (name), ' +
        'transaction_categories (name), ' +
        'contacts (name), ' +
        'currencies (code)'
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single() as PostgrestSingleResponse<RecurringTransactionWithRelatedData>;

    if (error) {
      if (error.code === 'PGRST116') {
        return { isSuccess: false, isError: true, message: 'Transação recorrente não encontrada.', data: null };
      }
      console.error(`Error fetching recurring transaction by ID (${id}):`, error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar transação recorrente: ${error.message}`, data: null };
    }
    
    if (!data) {
        return { isSuccess: false, isError: true, message: 'Transação recorrente não encontrada (sem dados).', data: null };
    }

    const responseData: RecurringTransactionWithRelatedData = {
      ...data,
      financial_account_name: data.financial_accounts?.name,
      category_name: data.transaction_categories?.name,
      contact_name: data.contacts?.name,
      currency_code: data.currencies?.code,
    };

    return { isSuccess: true, isError: false, data: responseData };

  } catch (e: any) {
    console.error('Unexpected error in getRecurringTransactionById:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: null };
  }
}

export async function updateRecurringTransactionAction(
  id: string,
  rawData: unknown
): Promise<ActionResponse<RecurringTransactionWithRelatedData>> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID da transação recorrente é obrigatório para atualização.' };
  }

  const supabase = getServiceRoleClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa ou não autenticado.',
    };
  }
  
  const validatedFields = UpdateRecurringTransactionSchema.omit({ id: true }).safeParse(rawData);

  if (!validatedFields.success) {
    console.error('Validation Error (UpdateRecurringTransaction):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados do formulário inválidos para atualização.',
      errors: validatedFields.error.errors,
    };
  }

  const updateData = { 
    ...validatedFields.data,
  };

  try {
    const { error: checkError } = await supabase
      .from('recurring_transactions')
      .select('id') 
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') { 
        return { isSuccess: false, isError: true, message: 'Transação recorrente não encontrada para atualização.' };
      }
      console.error('Error checking recurring transaction for update:', checkError);
      return { isSuccess: false, isError: true, message: `Erro ao verificar transação recorrente: ${checkError.message}` };
    }

    const { data: updatedRecTxData, error: updateError } = await supabase
      .from('recurring_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId) 
      .select(
        '*, ' +
        'financial_accounts (name), ' +
        'transaction_categories (name), ' +
        'contacts (name), ' +
        'currencies (code)'
      )
      .single() as PostgrestSingleResponse<RecurringTransactionWithRelatedData>;

    if (updateError) {
      console.error('Error updating recurring transaction:', updateError);
      return { isSuccess: false, isError: true, message: `Falha ao atualizar transação recorrente: ${updateError.message}` };
    }
    
    if (!updatedRecTxData) {
        return { isSuccess: false, isError: true, message: 'Falha ao obter dados da transação recorrente atualizada.' };
    }

    revalidatePath('/admin/financials/recurring-transactions'); 
    revalidatePath(`/admin/financials/recurring-transactions/${id}`);

    const responseData: RecurringTransactionWithRelatedData = {
      ...updatedRecTxData,
      financial_account_name: updatedRecTxData.financial_accounts?.name,
      category_name: updatedRecTxData.transaction_categories?.name,
      contact_name: updatedRecTxData.contacts?.name,
      currency_code: updatedRecTxData.currencies?.code,
    };

    return {
      isSuccess: true,
      isError: false,
      message: 'Transação recorrente atualizada com sucesso.',
      data: responseData,
    };

  } catch (e: any) {
    if (e instanceof ZodError) {
      return { isSuccess: false, isError: true, message: 'Erro de validação Zod.', errors: e.errors };
    }
    console.error('Unexpected error in updateRecurringTransactionAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
}

export async function deleteRecurringTransactionAction(id: string): Promise<ActionResponse> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID da transação recorrente é obrigatório para exclusão.' };
  }

  const supabase = getServiceRoleClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa ou não autenticado.',
    };
  }

  try {
    const { error: checkError } = await supabase
      .from('recurring_transactions')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') { 
         return { isSuccess: false, isError: true, message: 'Transação recorrente não encontrada para exclusão.' };
      }
      console.error('Error checking recurring transaction for deletion:', checkError);
      return { isSuccess: false, isError: true, message: 'Erro ao verificar transação recorrente antes da exclusão.' };
    }
    
    const { error: deleteError } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId); 

    if (deleteError) {
      console.error('Error deleting recurring transaction:', deleteError);
      return { isSuccess: false, isError: true, message: `Falha ao excluir transação recorrente: ${deleteError.message}` };
    }

    revalidatePath('/admin/financials/recurring-transactions');
    revalidatePath(`/admin/financials/recurring-transactions/${id}`);

    return { isSuccess: true, isError: false, message: 'Transação recorrente excluída com sucesso.' };

  } catch (e: any) {
    if (e instanceof ZodError) {
      return { isSuccess: false, isError: true, message: 'Erro de validação Zod.', errors: e.errors };
    }
    console.error('Unexpected error in deleteRecurringTransactionAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
}

// Placeholders for other recurring transaction actions
// export async function getRecurringTransactionsForCompany(...) { ... }
// export async function updateRecurringTransactionAction(...) { ... }
// export async function deleteRecurringTransactionAction(...) { ... }
// export async function pauseRecurringTransactionAction(...) { ... }
// export async function resumeRecurringTransactionAction(...) { ... }
// export async function finishRecurringTransactionAction(...) { ... }
// export async function generateDueRecurringTransactions(...) { ... } 