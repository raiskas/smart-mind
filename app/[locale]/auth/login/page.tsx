'use client';

import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes'; // Para adaptar o tema do Auth UI
import { useRouter } from 'next/navigation'; // Usar o router padrão por enquanto
import { useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// Nota: Se você tiver navegação localizada configurada em @/navigation,
// talvez precise usar useRouter ou Link de lá.
// import { useRouter } from '@/navigation'; // Corrigido no comentário também

export default function LoginPage() {
  const t = useTranslations('LoginPage'); // Carrega traduções do namespace 'LoginPage'
  const supabase = createClient();
  const { resolvedTheme } = useTheme(); // Obtém o tema atual (light/dark)
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Redirecionar para o dashboard após o login bem-sucedido
        // Idealmente, o redirecionamento deve levar em conta o locale, mas
        // o middleware deve tratar o redirecionamento inicial para a raiz
        // que então pode redirecionar para o dashboard localizad.
        // Simplificando por agora:
        router.push('/dashboard'); // Ou use o router localizado se configurado
      }
      // Poderia adicionar lógica para SIGNED_OUT se necessário
    });

    // Limpar o listener quando o componente desmontar
    return () => subscription.unsubscribe();
  }, [supabase, router]);


  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('signInTitle')}
        </h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa, variables: { default: { colors: {} } } }} // Ajuste básico de tema
          theme={resolvedTheme === 'dark' ? 'dark' : 'default'} // Aplica tema dark/light
          providers={['google', 'github']} // Adicione os providers que configurou no Supabase
          localization={{
            variables: {
              sign_in: {
                email_label: t('authForm.emailLabel'),
                password_label: t('authForm.passwordLabel'),
                email_input_placeholder: t('authForm.emailPlaceholder'),
                password_input_placeholder: t('authForm.passwordPlaceholder'),
                button_label: t('authForm.buttonLabel'),
                loading_button_label: t('authForm.loadingButtonLabel'),
                social_provider_text: 'Entrar com {{provider}}', // Exemplo, adicione traduções se necessário
                link_text: t('authForm.signUpLinkText'),
              },
              sign_up: {
                // Adicione traduções para o formulário de cadastro se usar
                email_label: t('authForm.emailLabel'),
                password_label: t('authForm.passwordLabel'),
                email_input_placeholder: t('authForm.emailPlaceholder'),
                password_input_placeholder: t('authForm.passwordPlaceholder'),
                button_label: 'Cadastrar', // Exemplo
                loading_button_label: 'Cadastrando...', // Exemplo
                link_text: 'Já tem uma conta? Entrar', // Exemplo
              },
              forgotten_password: {
                // Adicione traduções se usar
                email_label: t('authForm.emailLabel'),
                email_input_placeholder: t('authForm.emailPlaceholder'),
                button_label: 'Enviar instruções', // Exemplo
                loading_button_label: 'Enviando...', // Exemplo
                link_text: t('authForm.forgotPasswordLinkText'),
              },
              // Adicione outras chaves conforme necessário (magic_link, update_password, etc.)
            },
          }}
          // redirectTo="http://localhost:3000/auth/callback" // O callback handler cuidará disso
          showLinks={true} // Mostrar links para cadastro/recuperação de senha
        />
      </div>
    </div>
  );
} 