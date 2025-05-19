import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Importar TODOS os arquivos de mensagens estaticamente
import ptBRMessages from './messages/pt-BR.json';
import enUSMessages from './messages/en-US.json';
import esMessages from './messages/es.json';

export const locales = ['pt-BR', 'en-US', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt-BR';
export const localePrefix = 'as-needed';

// Adicionar definição e exportação de pathnames
export const pathnames = {
  // Use a barra para rotas que não devem ser traduzidas
  // Exemplo: '/dashboard': '/dashboard'
  // Se você quiser URLs traduzidas, defina-as aqui
  // Exemplo: '/about': { en: '/about', es: '/acerca-de', 'pt-BR': '/sobre' }
  '/': '/',
  '/dashboard': '/dashboard',
  '/profiles': '/profiles',
  '/login': '/login',
  // Admin User Management Paths
  '/admin/management/users': {
    'en-US': '/admin/management/users',
    'pt-BR': '/admin/gerenciamento/usuarios',
    'es': '/admin/gestion/usuarios'
  },
  '/admin/management/users/create': {
    'en-US': '/admin/management/users/create',
    'pt-BR': '/admin/gerenciamento/usuarios/criar',
    'es': '/admin/gestion/usuarios/crear'
  },
  '/admin/management/users/[userId]/edit': {
    'en-US': '/admin/management/users/[userId]/edit',
    'pt-BR': '/admin/gerenciamento/usuarios/[userId]/editar',
    'es': '/admin/gestion/usuarios/[userId]/editar'
  },
  // Admin Role Management Paths
  '/admin/management/roles': {
    'en-US': '/admin/management/roles',
    'pt-BR': '/admin/gerenciamento/funcoes', // Ou 'papeis'
    'es': '/admin/gestion/roles' // Ou 'funciones', 'papeletas'
  },
  '/admin/management/roles/create': {
    'en-US': '/admin/management/roles/create',
    'pt-BR': '/admin/gerenciamento/funcoes/criar',
    'es': '/admin/gestion/roles/crear'
  },
  '/admin/management/roles/[roleId]/edit': {
    'en-US': '/admin/management/roles/[roleId]/edit',
    'pt-BR': '/admin/gerenciamento/funcoes/[roleId]/editar',
    'es': '/admin/gestion/roles/[roleId]/editar'
  },
  // Company Management Paths
  '/admin/management/companies': {
    'en-US': '/admin/management/companies',
    'pt-BR': '/admin/gerenciamento/empresas',
    'es': '/admin/gestion/empresas'
  },
  // Financial Accounts Management Paths
  '/admin/management/financial-accounts': {
    'en-US': '/admin/management/financial-accounts',
    'pt-BR': '/admin/gerenciamento/contas-financeiras',
    'es': '/admin/gestion/cuentas-financieras'
  },
  // Transaction Categories Management Paths
  '/admin/management/financials/categories': {
    'en-US': '/admin/management/financials/categories',
    'pt-BR': '/admin/gerenciamento/financeiro/categorias',
    'es': '/admin/gestion/financiero/categorias'
  },
  // Transaction Management Paths
  '/admin/management/financials/transactions': {
    'en-US': '/admin/management/financials/transactions',
    'pt-BR': '/admin/gerenciamento/financeiro/transacoes',
    'es': '/admin/gestion/financiero/transacciones'
  },
  // Adicione outros caminhos conforme necessário
} as const;

// Mapeamento de locale para mensagens importadas
const messagesMap = {
  'pt-BR': ptBRMessages,
  'en-US': enUSMessages,
  'es': esMessages
};
// console.log('[i18n.ts] messagesMap inicializado. Conteúdo parcial de en-US:', JSON.stringify(messagesMap['en-US'] || {}).substring(0, 100) + '...');

export const i18n = {
  locales,
  defaultLocale,
};

export default getRequestConfig(async ({ locale }: { locale: string }) => {
  const validatedLocale = locale as Locale; // Validar e tipar o locale
  if (!locales.includes(validatedLocale)) {
    console.error(`[i18n.ts] Locale inválido recebido: ${locale}, redirecionando para notFound.`);
    notFound();
  }

  // Log para verificar qual locale está sendo processado e se as mensagens existem
  // console.log(`[i18n.ts] getRequestConfig para locale: ${validatedLocale}`);
  // if (!messagesMap[validatedLocale]) {
  //   console.error(`[i18n.ts] Mensagens não encontradas no messagesMap para o locale: ${validatedLocale}`);
  //   notFound(); // Ou alguma outra forma de tratamento de erro
  // } else {
  //   console.log(`[i18n.ts] Mensagens encontradas para ${validatedLocale}. Chaves (parcial): ${Object.keys(messagesMap[validatedLocale]).slice(0,10).join(', ')}`);
  // }

  return {
    locale: validatedLocale, // Usar o locale validado
    messages: messagesMap[validatedLocale] // Usar o messagesMap
  };
}); 