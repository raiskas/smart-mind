import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, localePrefix, pathnames, defaultLocale, type Locale } from './i18n';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Primeiro, configure o middleware da next-intl
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  pathnames,
  localePrefix,
});

export async function middleware(request: NextRequest) {
  let response = NextResponse.next(); // Começa com uma resposta padrão para passar adiante

  // Crie um cliente Supabase para uso no middleware
  // NOTA: O manuseio de cookies aqui é crucial e pode ser complexo quando combinado
  // com outros middlewares que também manipulam cookies (como next-intl).
  // Esta é uma implementação básica.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Certifique-se de que a requisição e a resposta sejam atualizadas com o cookie
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Determinar o prefixo de locale para redirecionamentos
  let detectedLocale: Locale = defaultLocale;
  const pathLocaleSegment = pathname.split('/')[1];
  if (locales.includes(pathLocaleSegment as Locale)) {
    detectedLocale = pathLocaleSegment as Locale;
  }
  
  // Com localePrefix = 'as-needed', o prefixo é usado se o locale detectado não for o default.
  const actualLocalePrefix = detectedLocale !== defaultLocale 
    ? `/${detectedLocale}`
    : '';

  // Rotas públicas que não exigem login
  const publicPaths = [`${actualLocalePrefix}/login`, `${actualLocalePrefix}/auth/callback`];
  if (actualLocalePrefix === '') { // Se não há prefixo, adicione as versões sem prefixo
    publicPaths.push('/login', '/auth/callback');
  }


  // 1. Se o usuário não está logado
  if (!session) {
    // Se estiver na raiz (sem locale ou com locale que leva à raiz lógica)
    if (pathname === '/' || pathname === `/${detectedLocale}`) {
      return NextResponse.redirect(new URL(`${actualLocalePrefix}/login`, request.url));
    }
    // Se não estiver em uma rota pública e não for uma API/asset
    const isPublic = publicPaths.some(p => pathname === p);
    const isAsset = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.'); // heurística para assets
    if (!isPublic && !isAsset) {
        // console.log(`[Middleware] Não logado, acesso a ${pathname} (públicas: ${publicPaths.join(', ')}), redirecionando para login`);
        return NextResponse.redirect(new URL(`${actualLocalePrefix}/login`, request.url));
    }
  } else { // 2. Se o usuário está logado
    // Se estiver na raiz, redirecione para dashboard
    if (pathname === '/' || pathname === `/${detectedLocale}`) {
      return NextResponse.redirect(new URL(`${actualLocalePrefix}/dashboard`, request.url));
    }
    // Se estiver tentando acessar /login já logado, redirecione para dashboard
    const loginPathWithLocale = `${actualLocalePrefix}/login`;
    if (pathname === loginPathWithLocale || (actualLocalePrefix === '' && pathname === '/login') ) {
      return NextResponse.redirect(new URL(`${actualLocalePrefix}/dashboard`, request.url));
    }
  }
  
  // Deferir para o middleware da next-intl para lidar com a internacionalização
  // Isso deve vir DEPOIS da lógica de autenticação para que os redirecionamentos de auth tenham prioridade.
  // A resposta do auth (seja um redirect ou o 'response' original) é passada para o intlMiddleware.
  if (response.headers.get('location')) { // Se o auth já decidiu redirecionar
    return response;
  }
  return intlMiddleware(request); // Deixe o intl processar a requisição (e a 'response' que preparamos)
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(pt-BR|en-US|es)/:path*', 
    // Enable redirects that add missing locales
    // (e.g. /products -> /en/products)
    // Exclude specific paths using negative lookaheads
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'
  ]
}; 