import { createClient } from "@/lib/supabase/server"; // Atualizado para usar o cliente de servidor
import { getTranslations, setRequestLocale } from 'next-intl/server'; // Corrigido para getTranslations e adicionado setRequestLocale
import { type Locale, locales, defaultLocale } from '@/i18n'; // Para obter o locale dos params

// A função agora pode receber o locale para mensagens de erro potenciais
async function getProfiles(locale: string) { 
  const supabase = createClient();
  const { data: profiles, error } = await supabase.from("profiles").select("*");

  if (error) {
    console.error("Error fetching profiles:", error.message);
    // Poderíamos usar o locale aqui para buscar uma mensagem de erro traduzida
    return []; 
  }
  return profiles;
}

// A página agora recebe params.locale
export default async function ProfilesPage({ params }: { params: { locale: string } }) {
  // Validar e definir o locale
  const localeToUse: Locale = locales.includes(params.locale as Locale) ? params.locale as Locale : defaultLocale;
  setRequestLocale(localeToUse);

  const t = await getTranslations({locale: localeToUse, namespace: 'ProfilesPage'});
  const commonT = await getTranslations({ locale: localeToUse, namespace: 'Common' }); // Carregar namespace Common
  const profiles = await getProfiles(localeToUse);

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1> 
      {profiles.length === 0 ? (
        <p>{t('noProfilesFound')}</p>
      ) : (
        <ul className="space-y-4">
          {profiles.map((profile) => (
            <li key={profile.id} className="p-4 border rounded-lg shadow">
              <h2 className="text-xl font-semibold">{profile.username || commonT('notAvailable')}</h2>
              <p>{t('fullNameLabel')}: {profile.full_name || commonT('notAvailable')}</p>
              <p>{t('avatarUrlLabel')}: {profile.avatar_url || commonT('notAvailable')}</p>
              <p>{t('profileIdLabel')}: {profile.id}</p>
              <p>{t('lastUpdatedLabel')}: {new Date(profile.updated_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
} 