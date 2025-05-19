import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { locales, defaultLocale, localePrefix, type Locale } from '@/i18n';

// Função auxiliar para obter o path localizado
const getLocalizedPath = (path: string, targetLocale: Locale) => {
    if (localePrefix === 'always' || (localePrefix === 'as-needed' && targetLocale !== defaultLocale)) {
      return `/${targetLocale}${path}`;
    }
    return path;
};

export async function GET(request: NextRequest, { params }: { params: { locale: string } }) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/'; // Rota de destino pós-autenticação
  const requestLocale = params.locale as Locale || defaultLocale;

  if (code) {
    // A biblioteca @supabase/ssr manipula cookies automaticamente na response
    // quando usada em Route Handlers e Middleware. Não precisamos manipular headers manualmente aqui.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          // Passamos set/remove para que a biblioteca possa definir os cookies na resposta
          // que será retornada pelo Route Handler.
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            // A biblioteca @supabase/ssr vai lidar com a aplicação disso na response final.
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            // A biblioteca @supabase/ssr vai lidar com a aplicação disso na response final.
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectPath = getLocalizedPath(next, requestLocale);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    } else {
        console.error('Supabase code exchange error:', error.message);
    }
  } else {
      console.error('No code found in auth callback request');
  }

  // Se houver erro ou nenhum código, redireciona para a página de login localizada
  const loginPath = getLocalizedPath('/login', requestLocale);
  return NextResponse.redirect(`${origin}${loginPath}?error=auth_callback_error`);
}
 