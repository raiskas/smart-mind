import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type Locale, locales, defaultLocale } from '@/i18n';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/navigation';
import { isAdmin } from '@/lib/authUtils';
import { updateRoleAction } from '@/app/actions/roleActions';
import { notFound as pageNotFound } from 'next/navigation';
import { type Role } from '@/lib/types/screens';
import RoleForm from '@/components/admin/RoleForm';

interface EditRolePageProps {
  params: {
    locale: string;
    roleId: string;
  };
}

export default async function EditRolePage({ params }: EditRolePageProps) {
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const supabase = createClient();
  const userIsAdmin = await isAdmin(supabase);

  if (!userIsAdmin) {
    redirect({ href: '/', locale: localeToUse });
  }

  const { roleId } = params;
  const t = await getTranslations({ locale: localeToUse, namespace: 'RoleManagementPage' });

  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select(`
      id,
      name,
      is_master,
      role_screen_permissions (
        screen_id,
        can_view,
        can_edit,
        can_delete
      )
    `)
    .eq('id', roleId)
    .single();

  if (roleError || !roleData) {
    console.error(`[EditRolePage] Erro ao buscar role ${roleId} ou role não encontrada:`, roleError?.message);
    pageNotFound();
  }

  const role: Role = {
    id: roleData.id,
    name: roleData.name,
    isMaster: roleData.is_master,
    screenPermissions: roleData.role_screen_permissions?.map(permission => ({
      screenId: permission.screen_id,
      canView: permission.can_view,
      canEdit: permission.can_edit,
      canDelete: permission.can_delete,
    })) || []
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          {t('editTitle', { roleName: role.name })}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('editDescription')}
        </p>
      </header>
      <section>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 max-w-xl mx-auto">
          <RoleForm
            formType="edit"
            serverAction={updateRoleAction}
            initialData={role}
          />
        </div>
      </section>
    </div>
  );
} 