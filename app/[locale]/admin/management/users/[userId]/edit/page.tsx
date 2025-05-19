import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type Locale, locales, defaultLocale } from '@/i18n';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/navigation';
import UserForm, { type Role, type UserProfileData } from '@/components/admin/UserForm';
import { updateUserAction } from '@/app/actions/userActions';
import { notFound as pageNotFound } from 'next/navigation'; // Para 404 se usuário não existir
import { isAdmin } from '@/lib/authUtils'; // Importar isAdmin refatorado

// Helper isAdmin -- REMOVIDO
// async function isAdmin(supabaseClient: ReturnType<typeof createClient>) { ... }

interface EditUserPageProps {
  params: {
    locale: string;
    userId: string;
  };
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const supabase = createClient();
  const userIsAdmin = await isAdmin(supabase);

  if (!userIsAdmin) {
    redirect({ href: '/', locale: localeToUse });
  }

  const { userId } = params;

  // Buscar dados do usuário a ser editado (somente da tabela profiles inicialmente)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, full_name, role_id')
    .eq('id', userId)
    .single();

  if (profileError || !profileData) {
    console.error(`Erro ao buscar perfil do usuário ${userId} para edição:`, profileError?.message);
    pageNotFound();
  }
  
  let userEmail: string | undefined;
  try {
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    if (authUserError) throw authUserError;
    if (authUser?.user) {
      userEmail = authUser.user.email;
    }
  } catch (error: any) {
    console.warn(`Não foi possível buscar o email para o usuário ${userId} via admin API:`, error.message);
    // Continuar mesmo se o email não puder ser buscado, o formulário pode lidar com email undefined
  }

  const { data: rolesData, error: rolesError } = await supabase.from('roles').select('id, name');
  if (rolesError) {
    console.error("Erro ao buscar roles para edição:", rolesError.message);
  }
  const roles: Role[] = rolesData || [];

  const t = await getTranslations({ locale: localeToUse, namespace: 'UserManagementPage' });
  const commonT = await getTranslations({ locale: localeToUse, namespace: 'Common' });

  const initialFormDataForForm: UserProfileData = {
    id: profileData.id,
    username: profileData.username,
    full_name: profileData.full_name,
    role_id: profileData.role_id,
    email: userEmail, 
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          {t('editUserTitle', { userId: profileData.username || userId })} 
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('editUserDescription')} 
        </p>
      </header>
      <section>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <UserForm
            roles={roles}
            formType="edit"
            initialData={initialFormDataForForm}
            serverAction={updateUserAction}
          />
        </div>
      </section>
    </div>
  );
} 