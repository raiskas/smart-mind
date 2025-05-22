import { createClient } from '@supabase/supabase-js';

// Certifique-se de que estas variáveis de ambiente estão definidas no seu ambiente Next.js
// (por exemplo, em .env.local ou nas configurações de deploy)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- INÍCIO DA MODIFICAÇÃO PARA DEBUG ---
console.log('[DEBUG lib/supabase/service.ts] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('[DEBUG lib/supabase/service.ts] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey);
// --- FIM DA MODIFICAÇÃO PARA DEBUG ---

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  console.error('[CRITICAL lib/supabase/service.ts] SUPABASE_SERVICE_ROLE_KEY está faltando ou vazia!');
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

// Este cliente usa a chave de SERVICE_ROLE e deve ser usado APENAS NO SERVIDOR
// para operações que requerem bypass de RLS ou permissões elevadas.
// NUNCA exponha a SUPABASE_SERVICE_ROLE_KEY no lado do cliente.
const supabaseServiceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // autoRefreshToken: false, // Desabilitar auto refresh para service role client
    // persistSession: false, // Não persistir sessão para service role client
    // detectSessionInUrl: false // Não detectar sessão na URL para service role
  }
});

export const getServiceRoleClient = () => {
    // Poderia adicionar lógica aqui se necessário, mas por enquanto retorna o cliente diretamente.
    return supabaseServiceRoleClient;
}; 