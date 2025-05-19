'use server';

import { createClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { z } from 'zod'; // Para validação
import { redirect } from '@/navigation'; // Corrigido: Usar @/navigation
import { revalidatePath } from 'next/cache'; // Importar revalidatePath

// Esquema de validação para os dados do formulário
const CreateUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  roleId: z.string().uuid({ message: "Invalid Role ID." }), // Assumindo que roleId é um UUID
  username: z.string().optional(),
  full_name: z.string().optional(),
  companyId: z.string().uuid({ message: "Invalid Company ID."}).or(z.literal('')).optional().nullable().transform(val => val === '' ? null : val), // Alterado para companyId (camelCase)
});

export async function createUserAction(
    prevState: { error?: string; success?: boolean; message?: string } | null,
    formData: FormData
): Promise<{ error?: string; success?: boolean; newUserId?: string; message?: string }> {
  const supabaseService = getServiceRoleClient();

  const rawFormData = Object.fromEntries(formData.entries());
  console.log('[CREATE USER ACTION] Raw FormData Entries:', rawFormData);
  const validatedFields = CreateUserSchema.safeParse(rawFormData);
  console.log('[CREATE USER ACTION] Validated Fields Result:', JSON.stringify(validatedFields, null, 2));

  if (!validatedFields.success) {
    console.error("[CREATE USER ACTION] Validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid form data. " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' '),
    };
  }

  const { email, password, roleId, username, full_name, companyId } = validatedFields.data;
  console.log(`[CREATE USER ACTION] Extracted roleId after Zod validation: ${roleId}`);
  console.log(`[CREATE USER ACTION] Extracted companyId after Zod validation: ${companyId}`);
  console.log(`[CREATE USER ACTION] Tentando criar usuário com email: ${email}`);

  // 1. Criar o usuário no Supabase Auth
  const { data: authUserResponse, error: authError } = await supabaseService.auth.admin.createUser({
    email,
    password,
    email_confirm: false, 
    user_metadata: {
      // full_name: full_name || '', 
      // username: username || '',
    }
  });

  if (authError) {
    console.error(`[CREATE USER ACTION] Supabase Auth Admin Error for email ${email}:`, authError.message);
    // Se o erro for que o usuário já existe, a mensagem será propagada.
    // O front-end pode querer tratar "User already registered" de forma especial.
    return { error: `Auth error: ${authError.message}` };
  }

  if (!authUserResponse || !authUserResponse.user) {
    console.error(`[CREATE USER ACTION] Supabase Auth Admin Error for email ${email}: No user data returned.`);
    return { error: 'Auth error: Could not create user (no user data returned).' };
  }

  const userId = authUserResponse.user.id;
  console.log(`[CREATE USER ACTION] Usuário Auth criado com ID: ${userId} para email: ${email}`);

  // 2. Criar o perfil.
  return await createOrUpdateProfileForUser(supabaseService, userId, roleId, username, full_name, email, companyId);
}

async function createOrUpdateProfileForUser(
    supabaseService: any, // Idealmente, use o tipo correto do SupabaseClient
    userId: string,
    roleId: string,
    username: string | null | undefined,
    full_name: string | null | undefined,
    email: string,
    companyId: string | null | undefined // Adicionado companyId
) {
    console.log(`[PROFILE HELPER] Tentando inserir/atualizar perfil para userId: ${userId} com roleId: ${roleId} e companyId: ${companyId}`);
    const profilePayload = {
        id: userId, 
        role_id: roleId,
        username: username || null,
        full_name: full_name || null,
        email: email, 
        company_id: companyId || null, // Manter snake_case para o banco
    };

    // Tentar inserir o perfil
    const { data: insertedProfileData, error: insertProfileError } = await supabaseService
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

    if (insertProfileError) {
        console.error(`[PROFILE HELPER] Supabase Profile Insert Error for userId ${userId}:`, insertProfileError.message, `Code: ${insertProfileError.code}`);
        
        // Se o erro for de chave duplicada (código '23505' para PostgreSQL)
        if (insertProfileError.code === '23505') { 
            console.warn(`[PROFILE HELPER] Perfil para userId ${userId} já existe (chave duplicada). Tentando atualizar.`);
            // Tentar atualizar o perfil existente
            const { data: updatedProfileData, error: updateProfileError } = await supabaseService
                .from('profiles')
                .update({ // Não precisa passar 'id' ou 'email' na atualização se não forem mutáveis aqui
                    role_id: roleId,
                    username: username || null,
                    full_name: full_name || null,
                    company_id: companyId || null, // Manter snake_case para o banco
                })
                .eq('id', userId)
                .select()
                .single();

            if (updateProfileError) {
                console.error(`[PROFILE HELPER] Supabase Profile Update Error for userId ${userId} (após tentativa de inserção falha):`, updateProfileError.message);
                // Para outros erros de perfil, tentar deletar o usuário do Auth para evitar órfãos.
                console.log(`[PROFILE HELPER] Tentando deletar usuário Auth ${userId} devido à falha na atualização do perfil (após inserção falha).`);
                await supabaseService.auth.admin.deleteUser(userId);
                console.log(`[PROFILE HELPER] Usuário Auth ${userId} deletado.`);
                return { error: `Profile update error (after duplicate key): ${updateProfileError.message}` };
            }

            if (!updatedProfileData) {
                console.error(`[PROFILE HELPER] Falha ao atualizar perfil para userId: ${userId} (após tentativa de inserção falha), nenhum dado retornado da atualização.`);
                console.log(`[PROFILE HELPER] Tentando deletar usuário Auth ${userId} devido à falha na atualização do perfil (sem dados de perfil retornados).`);
                await supabaseService.auth.admin.deleteUser(userId);
                console.log(`[PROFILE HELPER] Usuário Auth ${userId} deletado.`);
                return { error: 'Profile update error: Failed to update profile data (no data returned after duplicate key).' };
            }
            
            console.log(`[PROFILE HELPER] Perfil para userId ${userId} atualizado com sucesso após conflito de inserção.`);
            revalidatePath('/admin/management/users', 'layout');
            return { success: true, newUserId: userId, message: "User processed. Existing profile was updated." };
        }
        
        // Para outros erros de inserção de perfil, tentar deletar o usuário do Auth para evitar órfãos.
        console.log(`[PROFILE HELPER] Tentando deletar usuário Auth ${userId} devido à falha na criação do perfil (erro não relacionado a duplicidade).`);
        await supabaseService.auth.admin.deleteUser(userId);
        console.log(`[PROFILE HELPER] Usuário Auth ${userId} deletado.`);
        return { error: `Profile error: ${insertProfileError.message}` };
    }

    if (!insertedProfileData) {
      console.error(`[PROFILE HELPER] Falha ao inserir perfil para userId: ${userId}, nenhum dado retornado da inserção (mas sem erro explícito).`);
      console.log(`[PROFILE HELPER] Tentando deletar usuário Auth ${userId} devido à falha na criação do perfil (sem dados de perfil retornados).`);
      await supabaseService.auth.admin.deleteUser(userId);
      console.log(`[PROFILE HELPER] Usuário Auth ${userId} deletado.`);
      return { error: 'Profile error: Failed to insert profile data (no data returned).' };
    }

    console.log(`[PROFILE HELPER] Perfil criado com sucesso para userId: ${userId}`);
    revalidatePath('/admin/management/users', 'layout');
    return { success: true, newUserId: userId, message: "User created successfully!" };
}

// Esquema de validação para atualização (sem senha, email é opcional e não editável aqui)
const UpdateUserSchema = z.object({
  userId: z.string().uuid({ message: "Invalid User ID." }),
  roleId: z.string().uuid({ message: "Invalid Role ID." }),
  username: z.string().optional(),
  full_name: z.string().optional(),
  companyId: z.string().uuid({ message: "Invalid Company ID."}).or(z.literal('')).optional().nullable().transform(val => val === '' ? null : val), // Alterado para companyId (camelCase)
  // email: z.string().email().optional(), // Não vamos permitir edição de email por aqui
});

export async function updateUserAction(
  prevState: { error?: string; success?: boolean; message?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean; message?: string }> {
  const supabaseService = getServiceRoleClient();
  
  // Verificar permissões de admin novamente aqui seria uma boa prática de segurança,
  // embora a página já faça isso. Mas a action pode ser chamada de outros lugares.
  // const { data: { user: adminUser } } = await supabase.auth.getUser();
  // if (!adminUser) return { error: "Not authenticated" };
  // const { data: adminProfile } = await supabase.from('profiles').select('roles(name)').eq('id', adminUser.id).single();
  // if (adminProfile?.roles?.name !== 'admin') return { error: "Not authorized" };

  const rawFormData = Object.fromEntries(formData.entries());
  console.log('[UPDATE USER ACTION] Raw FormData Entries:', rawFormData);
  const validatedFields = UpdateUserSchema.safeParse(rawFormData);
  console.log('[UPDATE USER ACTION] Validated Fields Result:', JSON.stringify(validatedFields, null, 2));

  if (!validatedFields.success) {
    console.error("[UPDATE USER ACTION] Validation errors (update):", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid form data for update. " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' '),
    };
  }

  const { userId, roleId, username, full_name, companyId } = validatedFields.data;
  console.log(`[UPDATE USER ACTION] Extracted roleId after Zod validation: ${roleId} for userId: ${userId}`);
  console.log(`[UPDATE USER ACTION] Extracted companyId after Zod validation: ${companyId} for userId: ${userId}`);

  // Atualizar o perfil na tabela 'profiles'
  const { data: updatedProfileDataArray, error: profileError } = await supabaseService
    .from('profiles')
    .update({
      role_id: roleId,
      username: username || null,
      full_name: full_name || null,
      company_id: companyId, // Usar o valor de companyId (camelCase) validado para o campo company_id (snake_case) do banco
    })
    .eq('id', userId)
    .select(); // Removido .single() para inspecionar o array

  if (profileError) {
    console.error('Supabase Profile Update Error:', profileError.message);
    // A mensagem original do erro do Supabase pode ser mais informativa aqui
    return { error: `Profile update error: ${profileError.message}` };
  }

  // Verificar se a atualização retornou dados e se foi exatamente um perfil
  if (!updatedProfileDataArray || updatedProfileDataArray.length === 0) {
    console.error(`[UPDATE USER ACTION] Profile for userId ${userId} not found or not updated (no data returned or empty array).`);
    return { error: `Profile update error: User profile not found with ID ${userId}.` };
  }

  if (updatedProfileDataArray.length > 1) {
    // Isso não deveria acontecer se 'id' é a chave primária e única
    console.error(`[UPDATE USER ACTION] Multiple profiles returned for userId ${userId} after update. This indicates a data integrity issue.`);
    return { error: `Profile update error: Multiple profiles found for ID ${userId}. Data integrity issue.` };
  }

  // Neste ponto, updatedProfileDataArray contém exatamente um elemento, que é o perfil atualizado.
  // const updatedProfile = updatedProfileDataArray[0];
  console.log(`User profile ${userId} updated successfully.`);
  revalidatePath('/admin/management/users', 'layout'); // Revalidar após atualização
  return { success: true, message: "User updated successfully!" };
}

export async function deleteUserAction(
  userId: string 
): Promise<{ error?: string; success?: boolean; message?: string }> {
  if (!userId) {
    return { error: "User ID is required for deletion." };
  }
  // const supabase = createClient(); // Não usaremos mais o cliente padrão para auth.admin.deleteUser
  const supabaseService = getServiceRoleClient(); // Usar o cliente com service_role

  // 1. Excluir o usuário da tabela auth.users usando o cliente de serviço
  // As operações auth.admin.* geralmente requerem service_role.
  const { data: deletionData, error: authDeleteError } = await supabaseService.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    if (authDeleteError.message.toLowerCase().includes('not found')) {
        console.warn(`User ${userId} not found in auth, proceeding to delete profile.`);
        // Mesmo que não encontrado no auth, tentar deletar o perfil pode ser válido em alguns casos.
    } else {
        console.error(`Supabase Auth User Deletion Error for ${userId}:`, authDeleteError.message);
        return { error: `Auth user deletion error: ${authDeleteError.message}` };
    }
  }

  // 2. Excluir o perfil da tabela 'profiles' usando o cliente de serviço (para consistência e bypass de RLS)
  const { error: profileDeleteError } = await supabaseService
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileDeleteError) {
    // Não necessariamente um erro fatal se o usuário já foi deletado do auth e o perfil não existir
    // Mas logar é bom.
    console.warn(`Supabase Profile Deletion (after auth deletion attempt) for ${userId}:`, profileDeleteError.message);
    // Não retornaremos um erro aqui se a exclusão do auth foi bem-sucedida ou o usuário auth não foi encontrado,
    // pois o objetivo principal é remover o usuário.
    // Se profileDeleteError indicar algo diferente de "not found" (ex: erro de permissão se não usasse service_role),
    // então poderia ser um problema.
  }

  console.log(`User ${userId} (auth and/or profile) deletion process completed.`);
  revalidatePath('/admin/management/users', 'layout');
  return { success: true, message: "User deleted successfully!" };
} 