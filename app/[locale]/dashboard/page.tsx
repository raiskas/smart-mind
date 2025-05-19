// Este componente precisa acessar cookies, então não pode ser 'use client' diretamente
// a menos que os dados do usuário sejam passados como props.
// Para este exemplo, faremos um Server Component que busca os dados do usuário.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server' // Cliente do servidor
import { ClientLogoutButton } from '@/components/ClientLogoutButton' // Criaremos este
import { getTranslations } from 'next-intl/server'; // Importar
import { type Locale, locales, defaultLocale } from '@/i18n'; // Para obter o locale dos params
import { setRequestLocale } from 'next-intl/server'; // Para definir o locale

// Adicionar params para obter o locale
export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const supabase = createClient()

  // Validar e definir o locale
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const t = await getTranslations({ locale: localeToUse, namespace: 'DashboardPage' }); // Usar namespace
  const commonT = await getTranslations({ locale: localeToUse, namespace: 'Common' }); // Para textos comuns como 'Not set'

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // O middleware deve tratar isso. Se chegar aqui, algo está errado.
    // redirect(`/${localeToUse}/login`); 
  }

  // Opcional: Buscar dados do perfil do usuário se necessário
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('username, full_name')
  //   .eq('id', user.id)
  //   .single()

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {user && <ClientLogoutButton />} 
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('welcomeMessage')}</h2>
        <p className="text-gray-700 dark:text-gray-300">
          {t('greeting', { email: user?.email || commonT('guestUser') })}
        </p>
        <p className="text-gray-700 dark:text-gray-300 mt-2">
          {t('loggedInMessage')}
        </p>
        {/* {profile && (
          <div className="mt-4">
            <p>{t('usernameLabel')} {profile.username || commonT('notSet')}</p>
            <p>{t('fullNameLabel')} {profile.full_name || commonT('notSet')}</p>
          </div>
        )} */}
      </div>
      {/* Aqui você pode adicionar mais conteúdo ao seu dashboard */}
    </div>
  )
} 