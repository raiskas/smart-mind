import { z } from 'zod';

// Interface para metadados de paginação
export interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Interface padronizada para respostas de Server Actions
export interface ActionResponse<TData = null> {
  isSuccess: boolean;
  isError: boolean;
  message?: string;
  data?: TData;
  errors?: z.ZodIssue[]; // Para erros de validação Zod
  pagination?: PaginationData; // Adicionado para dados de paginação
}

// Interface para o contexto do usuário obtido nas Server Actions
export interface UserContext {
  userId: string | null;
  companyId: string | null;
} 