'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { CreateTransactionSchema, type Transaction, UpdateTransactionSchema } from '@/lib/schemas/transaction';
import { getCurrentUserContext } from '@/lib/auth/actions';
import type { ActionResponse } from '@/lib/types/actions';
import type { TransactionStatusValue, TransactionTypeValue } from '@/lib/constants/financial';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

export async function createTransactionAction(
  rawData: any 
): Promise<ActionResponse<Transaction>> {
  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId || !userId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa, não autenticado, ou ID de usuário não encontrado.',
    };
  }

  const validatedFields = CreateTransactionSchema.safeParse(rawData);

  if (!validatedFields.success) {
    console.error('Validation Error (CreateTransaction):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados do formulário inválidos. Por favor, corrija os erros.',
      errors: validatedFields.error.errors,
    };
  }

  let dataForSupabase = { ...validatedFields.data };
  if (dataForSupabase.contact_id === null) {
    delete dataForSupabase.contact_id;
  }

  const transactionData = {
    ...dataForSupabase,
    company_id: companyId,
    created_by_user_id: userId,
  };

  try {
    // TODO: Add any pre-insertion checks if necessary (e.g., financial account exists and belongs to company)
    // For now, relying on DB constraints and RLS for financial_account_id integrity.

    const { data: newTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting transaction:', insertError);
      // TODO: Check for specific DB errors, e.g., FK violation if financial_account_id is invalid
      return { isSuccess: false, isError: true, message: `Falha ao criar transação: ${insertError.message}` };
    }

    // TODO: Consider revalidating paths related to financial account balances or summaries
    revalidatePath('/admin/financials/transactions'); // Adjust path as needed
    if (transactionData.financial_account_id) {
      revalidatePath(`/admin/financials/accounts/${transactionData.financial_account_id}`);
    }

    return {
      isSuccess: true,
      isError: false,
      message: 'Transação criada com sucesso.',
      data: newTransaction,
    };

  } catch (e: any) {
    console.error('Unexpected error in createTransactionAction:', e);
    return { isSuccess: false, isError: true, message: `Ocorreu um erro inesperado: ${e.message}` };
  }
}

export interface TransactionFilters {
  dateFrom?: string; // ISO date string e.g., YYYY-MM-DD
  dateTo?: string;   // ISO date string e.g., YYYY-MM-DD
  type?: TransactionTypeValue;
  status?: TransactionStatusValue;
  financialAccountId?: string; 
  categoryId?: string;
  contactId?: string;
  description?: string; // For text search
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'transaction_date' | 'amount' | 'description'; // Field to sort by
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// Define a type for the transaction data returned by get actions, including related entity names
export type TransactionWithRelatedData = Transaction & {
  financial_account_name?: string | null;
  category_name?: string | null;
  contact_name?: string | null;
  currency_code?: string | null; // From the transaction's currency_id
};

export async function getTransactionsForCompany(
  filters?: TransactionFilters
): Promise<ActionResponse<TransactionWithRelatedData[]>> {
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
    let query = supabase
      .from('transactions')
      .select(`
        *,
        financial_accounts (name),
        transaction_categories (name),
        currencies (code)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (filters?.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('transaction_date', filters.dateTo);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.financialAccountId) {
      query = query.eq('financial_account_id', filters.financialAccountId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.contactId) {
      query = query.eq('contact_id', filters.contactId);
    }
    if (filters?.description) {
      query = query.ilike('description', `%${filters.description}%`);
    }
    if (filters?.minAmount !== undefined) {
      query = query.gte('amount', filters.minAmount);
    }
    if (filters?.maxAmount !== undefined) {
      query = query.lte('amount', filters.maxAmount);
    }

    // Sorting
    const sortBy = filters?.sortBy || 'transaction_date';
    const sortDirection = filters?.sortDirection || 'desc';
    query = query.order(sortBy, { ascending: sortDirection === 'asc' });
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar transações: ${error.message}`, data: [] };
    }

    const responseData: TransactionWithRelatedData[] = data?.map(t => ({
      ...t,
      financial_account_name: t.financial_accounts?.name,
      category_name: t.transaction_categories?.name,
      currency_code: t.currencies?.code,
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
    console.error('Unexpected error in getTransactionsForCompany:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: [] };
  }
}

export async function getTransactionById(id: string): Promise<ActionResponse<TransactionWithRelatedData | null>> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID da transação é obrigatório.', data: null };
  }

  const supabase = createClient(); // RLS-respecting client
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.', data: null };
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        financial_accounts (name),
        transaction_categories (name),
        currencies (code)
      `)
      .eq('id', id)
      .eq('company_id', companyId) // Ensure transaction belongs to the user's company
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // "Searched for a single row, but 0 rows were found"
        return { isSuccess: false, isError: true, message: 'Transação não encontrada.', data: null };
      }
      console.error(`Error fetching transaction by ID (${id}):`, error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar transação: ${error.message}`, data: null };
    }
    
    if (!data) { // Should be redundant due to PGRST116 handling, but as a safeguard
        return { isSuccess: false, isError: true, message: 'Transação não encontrada.', data: null };
    }

    const responseData: TransactionWithRelatedData = {
      ...data,
      financial_account_name: data.financial_accounts?.name,
      category_name: data.transaction_categories?.name,
      currency_code: data.currencies?.code,
    };

    return { isSuccess: true, isError: false, data: responseData };

  } catch (e: any) {
    console.error('Unexpected error in getTransactionById:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: null };
  }
}

export async function updateTransactionAction(
  id: string, // Transaction ID to update
  rawData: unknown
): Promise<ActionResponse<Transaction>> {
  if (!id || typeof id !== 'string' || !id.trim()) {
    return { isSuccess: false, isError: true, message: 'ID da transação é obrigatório para atualização.' };
  }

  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId || !userId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa, não autenticado, ou ID de usuário não encontrado.',
    };
  }

  // Note: UpdateTransactionSchema from transaction.ts includes 'id' but we take it as a separate param here.
  // We can either adjust the schema or parse rawData and then add id. For now, let's assume rawData is just the updatable fields.
  const validatedFields = UpdateTransactionSchema.omit({ id: true }).safeParse(rawData); 

  if (!validatedFields.success) {
    console.error('Validation Error (UpdateTransaction):', validatedFields.error.flatten().fieldErrors);
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados do formulário inválidos para atualização. Por favor, corrija os erros.',
      errors: validatedFields.error.errors,
    };
  }

  let dataForUpdate = { ...validatedFields.data };
  if (dataForUpdate.contact_id === null) {
    delete dataForUpdate.contact_id;
  }
  
  const updateData = {
    ...dataForUpdate,
    // company_id and created_by_user_id should not be changed on update.
    // updated_at will be handled by the database trigger.
  };

  try {
    // Verify the transaction exists and belongs to the company before updating
    const { data: existingTransaction, error: checkError } = await supabase
      .from('transactions')
      .select('id, financial_account_id') // Select fields needed for revalidation or further logic
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return { isSuccess: false, isError: true, message: 'Transação não encontrada para atualização.' };
      }
      console.error('Error checking transaction for update:', checkError);
      return { isSuccess: false, isError: true, message: `Erro ao verificar transação para atualização: ${checkError.message}` };
    }

    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return { isSuccess: false, isError: true, message: `Erro ao atualizar transação: ${updateError.message}` };
    }

    // TODO: Consider revalidating paths related to financial account balances or summaries
    revalidatePath('/admin/financials/transactions'); // Adjust path as needed
    if (updateData.financial_account_id) {
      revalidatePath(`/admin/financials/accounts/${updateData.financial_account_id}`);
    }

    return {
      isSuccess: true,
      isError: false,
      message: 'Transação atualizada com sucesso.',
      data: updatedTransaction,
    };

  } catch (e: any) {
    console.error('Unexpected error in updateTransactionAction:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}` };
  }
}

export async function deleteTransactionAction(id: string): Promise<ActionResponse<void>> {
  console.log(`[Action:DeleteTransaction] Attempting to delete transaction with ID: ${id}`);

  if (!id || typeof id !== 'string' || !id.trim()) {
    console.warn('[Action:DeleteTransaction] Invalid ID received.');
    return { isSuccess: false, isError: true, message: 'ID da transação é obrigatório para exclusão.' };
  }

  const supabase = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();
  console.log(`[Action:DeleteTransaction] User context: userId=${userId}, companyId=${companyId}`);

  if (!companyId || !userId) {
    console.warn('[Action:DeleteTransaction] User context invalid.');
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa, não autenticado, ou ID de usuário não encontrado.',
    };
  }

  try {
    console.log(`[Action:DeleteTransaction] Executing Supabase delete for id: ${id}, company_id: ${companyId}`);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('[Action:DeleteTransaction] Supabase error:', error);
      return { isSuccess: false, isError: true, message: `Erro ao excluir transação: ${error.message}` };
    }

    console.log(`[Action:DeleteTransaction] Supabase delete successful for id: ${id}. Revalidating path...`);
    revalidatePath('/admin/financials/transactions');
    // Adicione revalidação para a conta específica se o saldo for afetado e exibido em outro lugar
    // const transaction = await getTransactionById(id); // Não vai funcionar pois já foi deletada
    // if (transaction.data && transaction.data.financial_account_id) {
    //   revalidatePath(`/admin/financials/accounts/${transaction.data.financial_account_id}`);
    // }

    return { isSuccess: true, isError: false, message: 'Transação excluída com sucesso.' };

  } catch (e: any) {
    console.error('[Action:DeleteTransaction] Unexpected error:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}` };
  }
}