'use client'

import { useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter, usePathname } from '@/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('LoginPage')

  // const authCallbackPath = typeof window !== 'undefined' ? `${window.location.origin}${pathname}/auth/callback` : '' // Comentado pois correctAuthCallbackPath é usado
  let actualLocale = 'pt-BR'
  if (typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/')
    if (segments.length > 1 && segments[1].length === 5) {
      actualLocale = segments[1]
    }
  }
  const correctAuthCallbackPath = typeof window !== 'undefined' ? `${window.location.origin}/${actualLocale}/auth/callback` : ''

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          // console.log('[LoginPage] Evento SIGNED_IN. Tentando redirecionar...');
          // console.log('[LoginPage] window.location.href atual:', window.location.href);
          // console.log('[LoginPage] pathname (da next-intl usePathname):', pathname);
          // console.log('[LoginPage] actualLocale calculado:', actualLocale);
          router.push('/dashboard');
          router.refresh();
        } else if (event === 'SIGNED_OUT') {
          router.push('/login');
          router.refresh();
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // console.log('[LoginPage] Sessão existente. Tentando redirecionar para /dashboard...');
        router.push('/dashboard');
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, router])

  let currentTheme: 'dark' | 'light' | undefined = 'light'
  if (typeof window !== 'undefined') {
    currentTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'light'
  }

  const localizationVariables = {
    sign_in: {
      email_label: t('authForm.emailLabel'),
      password_label: t('authForm.passwordLabel'),
      email_input_placeholder: t('authForm.emailPlaceholder'),
      password_input_placeholder: t('authForm.passwordPlaceholder'),
      button_label: t('authForm.buttonLabel'),
      loading_button_label: t('authForm.loadingButtonLabel'),
      link_text: t('authForm.signUpLinkText'),
    },
    forgotten_password: {
      link_text: t('authForm.forgotPasswordLinkText'),
    },
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('signInTitle')}
          </h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme={currentTheme}
          redirectTo={correctAuthCallbackPath}
          view="sign_in"
          showLinks={true}
          localization={{ variables: localizationVariables }}
        />
      </div>
    </div>
  )
} 