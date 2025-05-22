'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import {
  CreateTransactionCategorySchema,
  UpdateTransactionCategorySchema,
  type CreateTransactionCategoryPayload,
  type UpdateTransactionCategoryPayload,
  type TransactionCategory
} from '@/lib/schemas/transactionCategory';
import { getCurrentUserContext } from '@/lib/auth/actions';
import type { ActionResponse } from '@/lib/types/actions';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// Caminho para revalidação
const CATEGORIES_PAGE_PATH = '/admin/financials/categories'; // Ajuste se o caminho for diferente

// Importar SelectOption e TransactionTypeValue
import type { SelectOption } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionFormModal';
import type { TransactionTypeValue } from '@/lib/constants/financial';

/**
 * Cria uma nova categoria de transação para a empresa do usuário logado.
 */
export async function createTransactionCategoryAction(
  payload: CreateTransactionCategoryPayload
): Promise<ActionResponse<TransactionCategory>> {
  const supabaseService = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.' };
  }

  const validatedFields = CreateTransactionCategorySchema.safeParse(payload);
  if (!validatedFields.success) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados inválidos para criar categoria.',
      errors: validatedFields.error.issues,
    };
  }

  const { name, type, description } = validatedFields.data;

  try {
    // A constraint UNIQUE (company_id, name, type) no BD já garante a unicidade.
    // Se houver uma tentativa de inserção duplicada, o Supabase retornará um erro.

    const { data: newCategory, error } = await supabaseService
      .from('transaction_categories')
      .insert({
        name,
        type,
        description,
        company_id: companyId,
        is_active: true, // Default, mas pode ser explícito
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction category:', error);
      if (error.code === '23505') { // Unique violation
        return { isSuccess: false, isError: true, message: 'Já existe uma categoria com este nome e tipo para sua empresa.' };
      }
      return { isSuccess: false, isError: true, message: `Erro ao criar categoria: ${error.message}` };
    }

    revalidatePath(CATEGORIES_PAGE_PATH);
    return { isSuccess: true, isError: false, message: 'Categoria criada com sucesso!', data: newCategory };

  } catch (e: any) {
    console.error('Unexpected error in createTransactionCategoryAction:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}` };
  }
}

/**
 * Atualiza uma categoria de transação existente.
 */
export async function updateTransactionCategoryAction(
  categoryId: string,
  payload: UpdateTransactionCategoryPayload
): Promise<ActionResponse<TransactionCategory>> {
  if (!categoryId) {
    return { isSuccess: false, isError: true, message: 'ID da categoria é obrigatório.' };
  }

  const supabaseService = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.' };
  }

  const validatedFields = UpdateTransactionCategorySchema.safeParse(payload);
  if (!validatedFields.success) {
    return {
      isSuccess: false,
      isError: true,
      message: 'Dados inválidos para atualizar categoria.',
      errors: validatedFields.error.issues,
    };
  }

  try {
    // Verificar se a categoria pertence à empresa do usuário
    const { data: existingCategory, error: fetchError } = await supabaseService
      .from('transaction_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching category for update check:', fetchError);
      return { isSuccess: false, isError: true, message: 'Erro ao verificar categoria.' };
    }

    if (!existingCategory) {
      return { isSuccess: false, isError: true, message: 'Categoria não encontrada ou não pertence à sua empresa.' };
    }
    
    // A constraint de unicidade no BD cuidará da verificação de nome/tipo duplicado ao atualizar.
    const { data: updatedCategory, error: updateError } = await supabaseService
      .from('transaction_categories')
      .update(validatedFields.data) // validatedFields.data já contém os campos corretos e opcionais
      .eq('id', categoryId)
      .eq('company_id', companyId) // Dupla verificação para segurança
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction category:', updateError);
       if (updateError.code === '23505') { // Unique violation
        return { isSuccess: false, isError: true, message: 'Já existe outra categoria com este nome e tipo para sua empresa.' };
      }
      return { isSuccess: false, isError: true, message: `Erro ao atualizar categoria: ${updateError.message}` };
    }

    revalidatePath(CATEGORIES_PAGE_PATH);
    revalidatePath(`${CATEGORIES_PAGE_PATH}/edit/${categoryId}`); // Se houver página de edição individual
    return { isSuccess: true, isError: false, message: 'Categoria atualizada com sucesso!', data: updatedCategory };

  } catch (e: any) {
    console.error('Unexpected error in updateTransactionCategoryAction:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}` };
  }
}

/**
 * Alterna o estado (ativo/inativo) de uma categoria de transação.
 */
export async function toggleTransactionCategoryActiveStateAction(
  categoryId: string,
  currentState: boolean
): Promise<ActionResponse> {
  if (!categoryId) {
    return { isSuccess: false, isError: true, message: 'ID da categoria é obrigatório.' };
  }
  const supabaseService = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.' };
  }

  try {
    const { error } = await supabaseService
      .from('transaction_categories')
      .update({ is_active: !currentState })
      .eq('id', categoryId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error toggling category active state:', error);
      return { isSuccess: false, isError: true, message: `Erro ao alterar estado da categoria: ${error.message}` };
    }

    revalidatePath(CATEGORIES_PAGE_PATH);
    return { isSuccess: true, isError: false, message: `Categoria ${!currentState ? 'ativada' : 'desativada'} com sucesso.` };

  } catch (e: any) {
    console.error('Unexpected error in toggleTransactionCategoryActiveStateAction:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}` };
  }
}

/**
 * Exclui uma categoria de transação.
 * ATENÇÃO: Isso só funcionará se não houver transações vinculadas a esta categoria devido a constraints FK.
 */
export async function deleteTransactionCategoryAction(categoryId: string): Promise<ActionResponse> {
  if (!categoryId) {
    return { isSuccess: false, isError: true, message: 'ID da categoria é obrigatório.' };
  }
  const supabaseService = getServiceRoleClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.' };
  }

  try {
    // Opcional: Verificar se existem transações vinculadas antes de tentar excluir
    // const { count, error: countError } = await supabaseService
    //   .from('transactions')
    //   .select('id', { count: 'exact' })
    //   .eq('category_id', categoryId)
    //   .eq('company_id', companyId); // Transações também são por empresa

    // if (countError) { /* ... handle error ... */ }
    // if (count && count > 0) {
    //   return { isSuccess: false, isError: true, message: 'Não é possível excluir. Categoria está em uso por transações.' };
    // }

    const { error } = await supabaseService
      .from('transaction_categories')
      .delete()
      .eq('id', categoryId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting transaction category:', error);
      // Códigos de erro comuns: '23503' (foreign key violation)
      if (error.code === '23503') {
        return { isSuccess: false, isError: true, message: 'Não é possível excluir. Categoria está em uso por transações.' };
      }
      return { isSuccess: false, isError: true, message: `Erro ao excluir categoria: ${error.message}` };
    }

    revalidatePath(CATEGORIES_PAGE_PATH);
    return { isSuccess: true, isError: false, message: 'Categoria excluída com sucesso!' };

  } catch (e: any) {
    console.error('Unexpected error in deleteTransactionCategoryAction:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}` };
  }
}

interface GetTransactionCategoriesParams {
  type?: 'income' | 'expense'; 
  isActive?: boolean; 
  name?: string;
  page?: number;
  pageSize?: number;
}

// Nova Action para o Select
interface GetTransactionCategoriesForSelectParams {
  type?: TransactionTypeValue; 
}

export async function getTransactionCategoriesForSelectAction(
  params?: GetTransactionCategoriesForSelectParams
): Promise<ActionResponse<SelectOption[]>> {
  console.log('[Action:GetCategoriesForSelect] Iniciada. Parâmetros:', params);
  const supabase = getServiceRoleClient();
  const { companyId, userId } = await getCurrentUserContext();
  console.log('[Action:GetCategoriesForSelect] Contexto: companyId:', companyId, 'userId:', userId);

  if (!companyId || !userId) {
    console.warn('[Action:GetCategoriesForSelect] ID da Empresa ou do Usuário não determinado.');
    return {
      isSuccess: false,
      isError: true,
      message: 'User not authenticated or not associated with a company.',
      data: [],
    };
  }

  try {
    let query = supabase
      .from('transaction_categories')
      .select('id, name, type')
      .eq('company_id', companyId)
      .eq('is_active', true) 
      .order('name', { ascending: true });

    if (params?.type) {
      console.log('[Action:GetCategoriesForSelect] Aplicando filtro de tipo:', params.type);
      query = query.eq('type', params.type);
    }

    const { data, error } = await query;
    console.log('[Action:GetCategoriesForSelect] Resultado da Query Supabase: data:', data, 'error:', error);

    if (error) {
      console.error('[Action:GetCategoriesForSelect] Erro ao buscar categorias para select:', error);
      return {
        isSuccess: false,
        isError: true,
        message: `Database error: ${error.message}`,
        data: [],
      };
    }

    const options: SelectOption[] = data?.map(cat => ({
      value: cat.id,
      label: cat.name, 
    })) || [];
    console.log('[Action:GetCategoriesForSelect] Opções formatadas:', options);

    return {
      isSuccess: true,
      isError: false,
      data: options,
    };

  } catch (err: any) {
    console.error('Unexpected error in getTransactionCategoriesForSelectAction:', err);
    return {
      isSuccess: false,
      isError: true,
      message: `An unexpected error occurred: ${err.message}`,
      data: [],
    };
  }
}

/**
 * Busca todas as categorias de transação para a empresa do usuário logado,
 * com suporte a filtros e paginação.
 */
export async function getTransactionCategoriesForCompany(
  params?: GetTransactionCategoriesParams
): Promise<ActionResponse<TransactionCategory[]>> {
  const supabase = createClient();
  const { companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.', data: [] };
  }

  const page = params?.page || 1;
  const pageSize = params?.pageSize || DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('transaction_categories')
      .select('*', { count: 'exact' }) // Solicitar contagem total
      .eq('company_id', companyId);

    if (params?.type) {
      query = query.eq('type', params.type);
    }
    if (params?.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }
    if (params?.name) {
      query = query.ilike('name', `%${params.name}%`);
    }

    // Aplicar ordenação e paginação
    query = query.order('name', { ascending: true }).range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching transaction categories:', error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar categorias: ${error.message}`, data: [] };
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
    console.error('Unexpected error in getTransactionCategoriesForCompany:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: [] };
  }
}

/**
 * Busca uma categoria de transação específica pelo ID, para a empresa do usuário logado.
 */
export async function getTransactionCategoryById(
  categoryId: string
): Promise<ActionResponse<TransactionCategory | null>> {
  if (!categoryId) {
    return { isSuccess: false, isError: true, message: 'ID da categoria é obrigatório.', data: null };
  }
  const supabase = createClient();
  const { userId, companyId } = await getCurrentUserContext();

  if (!companyId) {
    return { isSuccess: false, isError: true, message: 'Usuário não associado a uma empresa.', data: null };
  }

  try {
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('*')
      .eq('id', categoryId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching transaction category by ID:', error);
      return { isSuccess: false, isError: true, message: `Erro ao buscar categoria: ${error.message}`, data: null };
    }
    if (!data) {
      return { isSuccess: false, isError: true, message: 'Categoria não encontrada ou não pertence à sua empresa.', data: null };
    }
    return { isSuccess: true, isError: false, data };

  } catch (e: any) {
    console.error('Unexpected error in getTransactionCategoryById:', e);
    return { isSuccess: false, isError: true, message: `Erro inesperado: ${e.message}`, data: null };
  }
} 