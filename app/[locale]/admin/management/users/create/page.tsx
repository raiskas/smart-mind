import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type Locale, locales, defaultLocale } from '@/i18n';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/navigation'; // Para redirecionar após a criação
import UserForm, { type Role, type UserProfileData } from '@/components/admin/UserForm'; // UserProfileData não é usado aqui, mas Role é
import { createUserAction } from '@/app/actions/userActions'; // Importar a action
import { isAdmin } from '@/lib/authUtils'; // Importar isAdmin refatorado

// Helper para verificar se o usuário é admin -- REMOVIDO
// async function isAdmin(supabaseClient: ReturnType<typeof createClient>) { ... }

export default async function CreateUserPage({ params }: { params: { locale: string } }) {
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const supabase = createClient();
  const userIsAdmin = await isAdmin(supabase);

  if (!userIsAdmin) {
    redirect({ href: '/', locale: localeToUse });
  }

  const t = await getTranslations({ locale: localeToUse, namespace: 'UserManagementPage' }); // Reutilizar ou criar novo namespace
  const commonT = await getTranslations({ locale: localeToUse, namespace: 'Common' });

  // Buscar roles para o formulário
  const { data: rolesData, error: rolesError } = await supabase.from('roles').select('id, name');
  if (rolesError) {
    console.error("Erro ao buscar roles:", rolesError.message);
    // Tratar erro, talvez exibir uma mensagem
    // Retornar algo ou lançar erro para evitar passar rolesData undefined
  }

  const roles: Role[] = rolesData || [];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          {t('createUserTitle')} {/* Nova tradução */}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('createUserDescription')} {/* Nova tradução */}
        </p>
      </header>
      <section>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <UserForm 
            roles={roles} 
            formType="create"
            serverAction={createUserAction}
            // initialData não é necessário para criação
          />
        </div>
      </section>
    </div>
  );
} 