import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/authUtils';
import { type Role } from '@/lib/types/screens'; // Certifique-se que Role e ScreenPermission estão aqui
import RoleManagementPageClient from '@/components/admin/RoleManagementPageClient';
import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Removendo imports do Card e Alert se não forem mais usados
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
// import { ExclamationTriangleIcon } from "@radix-ui/react-icons"; 

// Função para buscar roles - Adapte conforme sua implementação real
async function getRoles(supabase: ReturnType<typeof createClient>): Promise<Role[]> {
  const { data: roles, error } = await supabase
    .from('roles')
    .select(`
      id,
      name,
      is_master,
      role_screen_permissions (
        screen_id,
        can_view,
        can_edit,
        can_delete,
        screen:screens (id, path, name) 
      )
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
  
  // Mapear para o formato esperado por `Role` e `ScreenPermission`
  return roles?.map(role => ({
    id: role.id,
    name: role.name,
    isMaster: role.is_master,
    screenPermissions: role.role_screen_permissions.map(perm => {
      // O TypeScript está inferindo perm.screen como um array.
      // Se tivermos certeza que é um objeto (ou null) retornado pelo Supabase,
      // podemos forçar a tipagem.
      const screenData = perm.screen as unknown as ({ id: string; path: string; name: string } | null);
      return {
        screenId: screenData?.id || 'unknown-screen-id',
        screenPath: screenData?.path || 'unknown-screen-path',
        canView: perm.can_view,
        canEdit: perm.can_edit,
        canDelete: perm.can_delete,
      };
    }) || [],
  })) || [];
}

interface RoleManagementPageProps {
  params: {
    locale: Locale;
  };
}

export default async function RoleManagementPage({ params: { locale } }: RoleManagementPageProps) {
  const cookieStore = cookies();
  const supabase = createClient();
  const t = await getTranslations({ locale, namespace: 'RoleManagementPage' });
  const tGlobal = await getTranslations({locale: locale, namespace: 'global'}); // Para erros globais

  const userIsAdmin = await isAdmin(supabase);

  if (!userIsAdmin) {
    redirect('/'); // Redireciona para a home se não for admin
  }

  const initialRoles = await getRoles(supabase);
  
  // Adicionando um tratamento caso getRoles retorne vazio devido a um erro interno não lançado
  // Ou se a intenção for mostrar um erro específico se não houver roles.
  // Por ora, se initialRoles estiver vazio (seja por erro ou não), o componente cliente tratará "noRolesFound"

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('pageTitle')}</CardTitle>
          <CardDescription>{t('pageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RoleManagementPageClient 
            initialRoles={initialRoles} 
            userIsAdmin={userIsAdmin} 
            locale={locale} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 