'use server';

import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import type { UserContext } from '@/lib/types/actions'; // Importar UserContext

// Função para obter o userId e company_id do usuário logado.
export async function getCurrentUserContext(): Promise<UserContext> {
  const supabaseCookieClient = createClient();
  const supabaseService = getServiceRoleClient();
  try {
    const { data: { user }, error: userError } = await supabaseCookieClient.auth.getUser();

    if (userError) {
      console.error('Error fetching user (cookie client):', userError.message);
      return { userId: null, companyId: null };
    }
    if (!user) {
      // Não é necessariamente um erro, apenas nenhum usuário logado.
      // console.log('No authenticated user found.'); 
      return { userId: null, companyId: null };
    }

    // Se o usuário existe, tentamos buscar o perfil.
    // O client Supabase para buscar 'profiles' deve ser capaz de acessar a tabela.
    // Usar supabaseService (com role de serviço) aqui é mais seguro para garantir acesso,
    // especialmente se RLS em 'profiles' for restritiva.
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Não registrar como erro fatal se for PGRST116 (not found), apenas significa que não tem perfil.
      if (profileError.code !== 'PGRST116') {
        console.error(`Error fetching profile for user ${user.id}:`, profileError.message);
      }
      // Mesmo com erro de perfil (ou perfil não encontrado), o userId é válido.
      return { userId: user.id, companyId: null }; 
    }

    // Se o perfil for encontrado, retornamos company_id.
    // profile.company_id pode ser null se não estiver definido no DB, o que é um estado válido.
    return { userId: user.id, companyId: profile.company_id };

  } catch (err: any) {
    console.error('Unexpected error in getCurrentUserContext:', err.message);
    return { userId: null, companyId: null };
  }
} 