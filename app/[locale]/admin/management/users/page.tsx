import { createClient } from '@/lib/supabase/server';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {type Locale, locales, defaultLocale} from '@/i18n';
import {redirect} from '@/navigation';
import { type UserData } from '@/components/admin/UserTable';
import UserManagementPageClient from '@/components/admin/UserManagementPageClient';
import { isAdmin } from '@/lib/authUtils';
import { type Role as UserFormRole } from '@/components/admin/UserForm';
import { getCompaniesAction } from '@/app/actions/companyActions';

// Helper para verificar se o usuário é admin
// async function isAdmin(supabaseClient: ReturnType<typeof createClient>) { ... }

export default async function UserManagementPage({params}: {params: {locale: string}}) {
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const supabase = createClient();
  const userIsAdmin = await isAdmin(supabase);

  if (!userIsAdmin) {
    console.warn('[UserManagementPage] Acesso negado: Usuário não é admin.');
    redirect({ href: '/', locale: localeToUse });
  }

  const t = await getTranslations({locale: localeToUse, namespace: 'UserManagementPage'});

  console.log('[UserManagementPage] Acesso permitido: Usuário é admin.');

  // Buscar todos os usuários, suas roles e companies
  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      full_name,
      email,
      company_id, 
      companies (id, name), 
      roles (id, name)
    `);

  if (usersError) {
    console.error("Erro ao buscar usuários:", usersError.message);
    // TODO: Adicionar tradução para mensagem de erro
    return <p>Error loading users: {usersError.message}</p>; 
  }

  const users: UserData[] = usersData?.map(user => ({
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    roles: user.roles ? { id: (user.roles as any).id, name: (user.roles as any).name } : null, 
    company_id: user.company_id,
    company_name: user.companies ? (user.companies as any).name : null,
  })) || [];

  // Buscar todas as roles disponíveis para o formulário
  const { data: availableRolesData, error: rolesError } = await supabase
    .from('roles')
    .select('id, name')
    .order('name', { ascending: true });

  if (rolesError) {
    console.error("Erro ao buscar roles disponíveis:", rolesError.message);
    // Lidar com o erro, talvez retornar array vazio ou mostrar mensagem
  }
  const availableRoles: UserFormRole[] = availableRolesData || [];

  // Buscar todas as empresas disponíveis para o formulário
  const companiesResult = await getCompaniesAction();
  if (companiesResult.error) {
    console.error("Erro ao buscar empresas disponíveis:", companiesResult.error);
    // Lidar com o erro, talvez retornar array vazio ou mostrar mensagem
  }
  const availableCompanies = companiesResult.companies || [];

  console.log('[UserManagementPage] Usuários processados:', users);
  console.log('[UserManagementPage] Dados finais dos usuários para o cliente:', JSON.stringify(users, null, 2));

  // TODO: Implementar busca e listagem de usuários aqui
  // Temporariamente, vamos exibir os dados brutos
  // const usersContent = users && users.length > 0 
  //   ? <pre>{JSON.stringify(users, null, 2)}</pre>
  //   : <p>{t('noUsersFound')}</p>; // Precisaremos desta tradução

  return (
    <UserManagementPageClient 
      initialUsers={users}
      availableRoles={availableRoles}
      availableCompanies={availableCompanies}
      userIsAdmin={userIsAdmin}
      locale={localeToUse}
    />
  );
} 