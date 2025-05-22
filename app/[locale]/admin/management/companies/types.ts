import { z } from 'zod';

// Tipos de dados crus, idealmente alinhados com o schema do banco ou gerados
export interface Company {
  id: string;
  name: string;
  official_name: string | null;
  tax_id: string | null;
  default_currency_id: string | null; // UUID - Alterado para permitir null
  created_at: string; // ISO Date String
  updated_at: string; // ISO Date String
}

export interface Currency {
  id: string; // UUID
  code: string; // ex: USD, BRL
  name: string; // ex: US Dollar, Real Brasileiro
  symbol?: string | null; // ex: $, R$
}

// Tipo para o estado do formulário, compatível com useFormState
// Usado tanto para criação/edição quanto para feedback de exclusão.
export interface ActionFormState {
  success?: boolean; // undefined para inicial, true para sucesso, false para erro
  message: string;
  // Usado para erros de validação de campo (Zod)
  errors?: z.ZodIssue[] | Record<string, string[] | undefined> | null;
  companyId?: string; // Opcional: pode ser usado para identificar a empresa em certas ações
}

// Tipo combinado para facilitar a exibição na tabela de empresas
export interface CompanyWithDetails extends Company {
  currency_name?: string; // Nome da moeda, ex: "Real Brasileiro"
  currency_code?: string; // Código da moeda, ex: "BRL"
}

// Tipo para os dados da empresa como recebidos da action getCompaniesAction ou para o formulário
// similar a Company, mas pode ter variações dependendo da fonte
export type CompanyData = {
  id: string;
  name: string;
  official_name?: string | null;
  tax_id?: string | null;
  default_currency_id?: string | null; // No formulário, pode começar como string vazia antes da validação
  created_at: string;
  updated_at: string;
  // TODO: Adicionar quaisquer outros campos que getCompaniesAction possa retornar
};

// Tipo para os dados de moeda como recebidos da action getCurrenciesAction
export type CurrencyData = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
}; 