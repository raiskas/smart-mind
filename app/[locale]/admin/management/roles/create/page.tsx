import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type Locale, locales, defaultLocale } from '@/i18n';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/navigation';
import { isAdmin } from '@/lib/authUtils';
import { createRoleAction } from '@/app/actions/roleActions';
import RoleForm from '@/components/admin/RoleForm'; // Importar RoleForm

export default async function CreateRolePage({ params }: { params: { locale: string } }) {
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const supabase = createClient();
  const userIsAdmin = await isAdmin(supabase);

  if (!userIsAdmin) {
    redirect({ href: '/', locale: localeToUse });
  }

  const t = await getTranslations({ locale: localeToUse, namespace: 'RoleManagementPage' });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          {t('createTitle')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('createDescription')}
        </p>
      </header>
      <section>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 max-w-xl mx-auto">
          <RoleForm
            formType="create"
            serverAction={createRoleAction}
            // initialData não é necessário para criação
          />
        </div>
      </section>
    </div>
  );
} 