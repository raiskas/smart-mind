import { getContactsForCompanyAction } from '@/app/actions/contactActions';
import { getTranslations } from 'next-intl/server';
import { unstable_setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactManagementPageClient } from './components/ContactManagementPageClient';

interface ContactsPageProps {
  params: {
    locale: string;
  };
  searchParams?: {
    page?: string;
    pageSize?: string;
    searchTerm?: string;
    // Add other search params as needed
  };
}

export default async function ContactsManagementPage({ params: { locale }, searchParams }: ContactsPageProps) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('contacts_page'); // Namespace para traduções desta página
  const tGlobal = await getTranslations('global');

  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams?.pageSize ? parseInt(searchParams.pageSize, 10) : 10;
  const searchTerm = searchParams?.searchTerm;

  // TODO: Implementar isAdmin ou hasScreenPermission check aqui para proteger a rota
  // Exemplo: 
  // const admin = await isAdmin();
  // if (!admin) { redirect(`/${locale}/dashboard`); }

  const result = await getContactsForCompanyAction({
    page,
    pageSize,
    searchTerm,
  });

  if (!result.isSuccess) {
    // TODO: Melhorar o tratamento de erro, talvez com um componente de erro dedicado
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500">
          {t('error_loading_contacts')}: {result.message}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('page_title')}</CardTitle>
          <CardDescription>{t('page_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactManagementPageClient 
            initialContacts={result.data?.contacts || []} 
            totalCount={result.data?.totalCount || 0}
            currentPage={page}
            pageSize={pageSize}
            searchTerm={searchTerm}
            // Pass translations for client component if needed
            // Ex: tCreateButton={t('create_contact_button')}
          />
        </CardContent>
      </Card>
    </div>
  );
} 