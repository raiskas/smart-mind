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
  status?: TransactionStatusValue | TransactionStatusValue[];
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

// Tipo de retorno da action atualizado
export interface GetTransactionsResponse {
  data: TransactionWithRelatedData[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  totalAmountFiltered?: number; // Novo campo para o somatório
}

export async function getTransactionsForCompany(
  filters?: TransactionFilters
): Promise<ActionResponse<GetTransactionsResponse>> { // Tipo de retorno atualizado
  const supabase = createClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Usuário não associado a uma empresa.',
      data: { // Estrutura de erro compatível
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: filters?.pageSize || DEFAULT_PAGE_SIZE,
          totalCount: 0,
          totalPages: 0,
        },
        totalAmountFiltered: 0
      }
    };
  }

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    // Query base para filtros (usada para dados e para soma)
    let baseQuery = supabase
      .from('transactions')
      .select(`*`, { head: false }) // Não precisamos de count para a query de soma inicialmente
      .eq('company_id', companyId);

    // Aplicar filtros à query base
    if (filters?.dateFrom) {
      baseQuery = baseQuery.gte('transaction_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      baseQuery = baseQuery.lte('transaction_date', filters.dateTo);
    }
    if (filters?.type) {
      baseQuery = baseQuery.eq('type', filters.type);
    }
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        baseQuery = baseQuery.in('status', filters.status);
      } else {
        baseQuery = baseQuery.eq('status', filters.status);
      }
    }
    if (filters?.financialAccountId) {
      baseQuery = baseQuery.eq('financial_account_id', filters.financialAccountId);
    }
    if (filters?.categoryId) {
      baseQuery = baseQuery.eq('category_id', filters.categoryId);
    }
    if (filters?.contactId) {
      baseQuery = baseQuery.eq('contact_id', filters.contactId);
    }
    if (filters?.description) {
      baseQuery = baseQuery.ilike('description', `%${filters.description}%`);
    }
    if (filters?.minAmount !== undefined) {
      baseQuery = baseQuery.gte('amount', filters.minAmount);
    }
    if (filters?.maxAmount !== undefined) {
      baseQuery = baseQuery.lte('amount', filters.maxAmount);
    }

    // Query para buscar os dados paginados (com joins e count)
    let dataQuery = supabase
      .from('transactions')
      .select(`
        *,
        financial_accounts (name),
        transaction_categories (name),
        currencies (code)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Reaplicar filtros à dataQuery (ou clonar baseQuery antes de adicionar joins e select específico)
    // Para simplicidade, reaplicamos os filtros.
    if (filters?.dateFrom) { dataQuery = dataQuery.gte('transaction_date', filters.dateFrom); }
    if (filters?.dateTo) { dataQuery = dataQuery.lte('transaction_date', filters.dateTo); }
    if (filters?.type) { dataQuery = dataQuery.eq('type', filters.type); }
    if (filters?.status) {
      if (Array.isArray(filters.status)) { dataQuery = dataQuery.in('status', filters.status); }
      else { dataQuery = dataQuery.eq('status', filters.status); }
    }
    if (filters?.financialAccountId) { dataQuery = dataQuery.eq('financial_account_id', filters.financialAccountId); }
    if (filters?.categoryId) { dataQuery = dataQuery.eq('category_id', filters.categoryId); }
    if (filters?.contactId) { dataQuery = dataQuery.eq('contact_id', filters.contactId); }
    if (filters?.description) { dataQuery = dataQuery.ilike('description', `%${filters.description}%`); }
    if (filters?.minAmount !== undefined) { dataQuery = dataQuery.gte('amount', filters.minAmount); }
    if (filters?.maxAmount !== undefined) { dataQuery = dataQuery.lte('amount', filters.maxAmount); }
    
    // Sorting para dataQuery
    const sortBy = filters?.sortBy || 'transaction_date';
    const sortDirection = filters?.sortDirection || 'desc';
    dataQuery = dataQuery.order(sortBy, { ascending: sortDirection === 'asc' });
    dataQuery = dataQuery.order('created_at', { ascending: false });

    // Paginação para dataQuery
    dataQuery = dataQuery.range(offset, offset + pageSize - 1);

    const { data, error: dataError, count } = await dataQuery;

    if (dataError) {
      console.error('Error fetching transactions (data):', dataError);
      return {
        isSuccess: false,
        isError: true,
        message: `Erro ao buscar transações: ${dataError.message}`,
        data: { // Estrutura de erro compatível
          data: [],
          pagination: {
            currentPage: page,
            pageSize: pageSize,
            totalCount: 0,
            totalPages: 0,
          },
          totalAmountFiltered: 0
        }
      };
    }

    // Query para calcular a soma total dos valores filtrados
    // Reutilizando baseQuery para aplicar os mesmos filtros
    const { data: sumData, error: sumError } = await baseQuery.select('amount');
    
    if (sumError) {
      console.error('Error fetching sum of transactions:', sumError);
      // Não retornar erro fatal aqui, podemos prosseguir sem a soma se falhar
      // Ou tratar como erro dependendo do requisito
    }

    let totalAmountFiltered = 0;
    if (sumData) {
      totalAmountFiltered = sumData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    }

    const responseData: TransactionWithRelatedData[] = data?.map(t => ({
      ...t,
      financial_account_name: t.financial_accounts?.name,
      category_name: t.transaction_categories?.name,
      currency_code: t.currencies?.code,
      contact_name: (t as any).contacts?.name, // Adicionar contact_name se existir (precisa de join se não tiver)
    })) || [];

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Construir o objeto GetTransactionsResponse separadamente
    const responsePayload: GetTransactionsResponse = {
      data: responseData,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
      },
      totalAmountFiltered: totalAmountFiltered
    };

    return {
      isSuccess: true,
      isError: false,
      message: 'Transações buscadas com sucesso.',
      data: responsePayload // Usar o payload construído
    };

  } catch (e: any) {
    console.error('Unexpected error in getTransactionsForCompany:', e);
    // Garantir que o retorno de erro também seja compatível
    const errorPayload: GetTransactionsResponse = {
      data: [],
      pagination: {
        currentPage: filters?.page || 1,
        pageSize: filters?.pageSize || DEFAULT_PAGE_SIZE,
        totalCount: 0,
        totalPages: 0,
      },
      totalAmountFiltered: 0
    };
    return { 
      isSuccess: false, 
      isError: true, 
      message: `Ocorreu um erro inesperado: ${e.message}`,
      data: errorPayload
    };
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