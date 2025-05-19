'use server';

import { createClient } from '@/lib/supabase/server';
import { CreateRoleSchema, UpdateRoleSchema } from '@/lib/schemas/roleSchemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

export async function createRoleAction(prevState: any, formData: FormData) {
  const supabase = createClient();
  // const locale = await getLocale(); // Para futuras traduções de mensagens

  // Extrair dados brutos do FormData
  const nameValue = formData.get('name');
  const isMasterValue = formData.get('isMaster') === 'on';

  // Lógica de extração de permissões ajustada
  const extractedPermissions: Record<string, { screenId: string; canView: boolean; canEdit: boolean; canDelete: boolean }> = {};
  for (const [key, value] of Array.from(formData.entries())) {
    if (typeof key === 'string' && key.startsWith('permissions[')) {
      // Exemplo de chave: permissions[0f5880ad-e6e9-4d5f-ae03-4a789278475a].canView
      const screenIdMatch = key.match(/^permissions\[([0-9a-fA-F\-]+)\]/); // Captura o UUID
      if (screenIdMatch && screenIdMatch[1]) {
        const screenId = screenIdMatch[1];
        if (!extractedPermissions[screenId]) {
          extractedPermissions[screenId] = { screenId: screenId, canView: false, canEdit: false, canDelete: false };
        }

        if (key.endsWith('.canView')) {
          extractedPermissions[screenId].canView = value === 'on';
        } else if (key.endsWith('.canEdit')) {
          extractedPermissions[screenId].canEdit = value === 'on';
        } else if (key.endsWith('.canDelete')) {
          extractedPermissions[screenId].canDelete = value === 'on';
        }
      }
    }
  }

  // Converter o objeto de permissões em um array
  const permissionsArray = Object.values(extractedPermissions || {});

  // Validar usando o CreateRoleSchema do Zod
  const validatedFields = CreateRoleSchema.safeParse({
    name: typeof nameValue === 'string' ? nameValue : '',
    isMaster: typeof isMasterValue === 'boolean' ? isMasterValue : false,
    screenPermissions: permissionsArray,
  });

  if (!validatedFields.success) {
    // console.error('[ActionError:CreateRole] Validation failed:', validatedFields.error.flatten()); // LOG REMOVIDO
    const flatErrors = validatedFields.error.flatten().fieldErrors;
    if (flatErrors.screenPermissions) {
      // Retornar erro mais genérico agora que a causa raiz foi corrigida
      return { error: `Validation error in screenPermissions.`, fieldErrors: flatErrors };
    }
    const errorMessages = Object.entries(flatErrors)
      .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
      .join('; ') || "Validation failed.";
    return { error: errorMessages, fieldErrors: flatErrors };
  }

  const { name, isMaster, screenPermissions: validatedScreenPermissions } = validatedFields.data;

  // DIAGNÓSTICO REMOVIDO
  // console.log('[Action:CreateRole] validatedScreenPermissions APÓS validação Zod:', JSON.stringify(validatedScreenPermissions, null, 2));
  // if (!isMaster && permissionsArray.length > 0 && validatedScreenPermissions.length === 0) { ... }
  // if (!isMaster && permissionsArray.length === 0 && Array.from(formData.keys()).some(key => key.startsWith('permissions['))) { ... }

  try {
    // Verificar se já existe uma role com o mesmo nome
    const { data: existingRole, error: selectError } = await supabase
      .from('roles')
      .select('name')
      .eq('name', name)
      .maybeSingle();

    if (selectError) {
      console.error('[ActionError:CreateRole] Supabase select error:', selectError.message);
      return { error: "Database error: Could not check for existing role." };
    }

    if (existingRole) {
      return { error: `Role with name \"${name}\" already exists.` };
    }

    // Inserir a nova role
    const { data: newRole, error: insertError } = await supabase
      .from('roles')
      .insert({ name, is_master: isMaster })
      .select('id') // Selecionar apenas o ID
      .single();

    if (insertError || !newRole) {
      console.error('[ActionError:CreateRole] Supabase insert error:', insertError?.message);
      return { error: "Database error: Could not create role." };
    }

    // Inserir permissões de tela, se houver alguma
    if (validatedScreenPermissions && validatedScreenPermissions.length > 0) {
        const screenPermissionsToInsert = validatedScreenPermissions.map(permission => ({
            role_id: newRole.id,
            screen_id: permission.screenId,
            can_view: permission.canView,
            can_edit: permission.canEdit,
            can_delete: permission.canDelete,
        }));

        // console.log('[Action:CreateRole] Tentando inserir permissões:', JSON.stringify(screenPermissionsToInsert, null, 2)); // LOG REMOVIDO

        const { error: permissionsError } = await supabase
            .from('role_screen_permissions')
            .insert(screenPermissionsToInsert);

        if (permissionsError) {
            // console.error('[ActionError:CreateRole] Error inserting permissions:', permissionsError.message, 'Input:', JSON.stringify(screenPermissionsToInsert, null, 2)); // LOG REMOVIDO
            return { error: `Database error inserting permissions: ${permissionsError.message}` };
        } else {
            // console.log('[Action:CreateRole] Permissões inseridas com sucesso para role:', newRole.id); // LOG REMOVIDO
        }
    }

    // Revalidar o path para atualizar a lista de roles na UI
    revalidatePath('/admin/management/roles', 'page');
    return { success: true, message: `Role \"${name}\" created successfully.` };

  } catch (e: any) {
    console.error('[ActionError:CreateRole] Unexpected error:', e.message);
    return { error: "An unexpected error occurred." };
  }
}

export async function updateRoleAction(prevState: any, formData: FormData) {
  const supabase = createClient();
  // const locale = await getLocale();

  const rawData = {
    id: formData.get('roleId'),
    name: formData.get('name'),
    isMaster: formData.get('isMaster') === 'on',
    // screenPermissions será preenchido abaixo com a lógica ajustada
  };

  // Lógica de extração de permissões ajustada para updateRoleAction
  const extractedPermissionsForUpdate: Record<string, { screenId: string; canView: boolean; canEdit: boolean; canDelete: boolean }> = {};
  for (const [key, value] of Array.from(formData.entries())) {
    if (typeof key === 'string' && key.startsWith('permissions[')) {
      const screenIdMatch = key.match(/^permissions\[([0-9a-fA-F\-]+)\]/);
      if (screenIdMatch && screenIdMatch[1]) {
        const screenId = screenIdMatch[1];
        if (!extractedPermissionsForUpdate[screenId]) {
          extractedPermissionsForUpdate[screenId] = { screenId: screenId, canView: false, canEdit: false, canDelete: false };
        }
        if (key.endsWith('.canView')) {
          extractedPermissionsForUpdate[screenId].canView = value === 'on';
        } else if (key.endsWith('.canEdit')) {
          extractedPermissionsForUpdate[screenId].canEdit = value === 'on';
        } else if (key.endsWith('.canDelete')) {
          extractedPermissionsForUpdate[screenId].canDelete = value === 'on';
        }
      }
    }
  }

  // console.log(`[Action:UpdateRole] Recebido rawData (sem screenPermissions ainda):`, JSON.stringify(rawData, null, 2)); // LOG REMOVIDO
  // console.log(`[Action:UpdateRole] extractedPermissionsForUpdate:`, JSON.stringify(extractedPermissionsForUpdate, null, 2)); // LOG REMOVIDO

  const permissionsArrayForUpdate = Object.values(extractedPermissionsForUpdate || {});
  // console.log('[Action:UpdateRole] Permissions Array para validação:', permissionsArrayForUpdate); // LOG REMOVIDO

  const validatedFields = UpdateRoleSchema.safeParse({
    id: rawData.id as string ?? '',
    name: rawData.name as string ?? '',
    isMaster: rawData.isMaster as boolean ?? false,
    screenPermissions: permissionsArrayForUpdate,
  });

  if (!validatedFields.success) {
    // console.error('[ActionError:UpdateRole] Validation failed:', validatedFields.error.flatten()); // LOG REMOVIDO
    const flatErrors = validatedFields.error.flatten().fieldErrors;
    const errorMessages = Object.entries(flatErrors)
      .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
      .join('; ') || "Validation failed.";
    return { error: errorMessages, fieldErrors: flatErrors };
  }
  
  const { id, name, isMaster, screenPermissions } = validatedFields.data;

  try {
    const {data: currentRole, error: currentRoleError} = await supabase
      .from('roles')
      .select('name')
      .eq('id', id)
      .single();

    if (currentRoleError || !currentRole) {
      console.error('[ActionError:UpdateRole] Error fetching current role or role not found:', currentRoleError?.message);
      return { error: "Role not found or database error during admin check." };
    }

    if (currentRole.name.toLowerCase() === 'admin' && name.toLowerCase() !== 'admin') {
      return { error: "The 'admin' role name cannot be changed." };
    }
    if (name.toLowerCase() === 'admin' && currentRole.name.toLowerCase() !== 'admin') {
      return { error: "Cannot rename another role to 'admin'." };
    }

    const { data: existingRoleWithNewName, error: selectError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', name)
      .not('id', 'eq', id)
      .maybeSingle();

    if (selectError) {
      console.error('[ActionError:UpdateRole] Supabase select error for name uniqueness:', selectError.message);
      return { error: "Database error: Could not check for existing role name." };
    }

    if (existingRoleWithNewName) {
      return { error: `Another role with name \"${name}\" already exists.` };
    }

    const { error: updateError } = await supabase
      .from('roles')
      .update({ name, is_master: isMaster })
      .eq('id', id);

    if (updateError) {
      console.error('[ActionError:UpdateRole] Supabase update error:', updateError.message);
      return { error: "Database error: Could not update role." };
    }

    // Atualizar permissões de tela
    // Primeiro, remover todas as permissões existentes
    // LOG ANTES DE DELETAR PERMISSÕES ANTIGAS
    // console.log(`[Action:UpdateRole] Tentando deletar permissões existentes para role: ${id}`); // LOG REMOVIDO
    const { error: deletePermissionsError } = await supabase
      .from('role_screen_permissions')
      .delete()
      .eq('role_id', id);

    if (deletePermissionsError) {
      // LOG SE A EXCLUSÃO FALHAR
      // console.error('[ActionError:UpdateRole] Error deleting existing permissions:', deletePermissionsError.message, `Role ID: ${id}`); // LOG REMOVIDO
      return { error: `Database error deleting permissions: ${deletePermissionsError.message}` }; // Retornar mensagem de erro detalhada do Supabase
    } else {
      // LOG SE A EXCLUSÃO FOR BEM SUCEDIDA
      // console.log(`[Action:UpdateRole] Permissões existentes deletadas para role: ${id}`); // LOG REMOVIDO
    }

    // Depois, inserir as novas permissões
    if (screenPermissions && screenPermissions.length > 0) {
      const screenPermissionsToInsert = screenPermissions.map(permission => ({
        role_id: id,
        screen_id: permission.screenId,
        can_view: permission.canView,
        can_edit: permission.canEdit,
        can_delete: permission.canDelete,
      }));

      // LOG ANTES DE INSERIR NOVAS PERMISSÕES
      // console.log(`[Action:UpdateRole] Tentando inserir novas permissões para role ${id}:`, JSON.stringify(screenPermissionsToInsert, null, 2)); // LOG REMOVIDO

      const { error: insertPermissionsError } = await supabase
        .from('role_screen_permissions')
        .insert(screenPermissionsToInsert);

      if (insertPermissionsError) {
        // LOG SE A INSERÇÃO FALHAR
        // console.error('[ActionError:UpdateRole] Error inserting new permissions:', insertPermissionsError.message, 'Input:', JSON.stringify(screenPermissionsToInsert, null, 2)); // LOG REMOVIDO
        return { error: `Database error inserting new permissions: ${insertPermissionsError.message}` }; // Retornar mensagem de erro detalhada do Supabase
      } else {
        // LOG SE A INSERÇÃO FOR BEM SUCEDIDA
        // console.log(`[Action:UpdateRole] Novas permissões inseridas com sucesso para role: ${id}`); // LOG REMOVIDO
      }
    }

    revalidatePath('/admin/management/roles', 'page');
    return { success: true, message: `Role updated to \"${name}\" successfully.` };

  } catch (e: any) {
    console.error('[ActionError:UpdateRole] Unexpected error:', e.message);
    return { error: "An unexpected error occurred." };
  }
}

export async function deleteRoleAction(roleId: string) {
  const supabase = createClient();
  // const locale = await getLocale();

  if (!roleId || !z.string().uuid().safeParse(roleId).success) {
     return { error: "Invalid Role ID provided." };
  }
  
  try {
    const { data: roleToDelete, error: fetchError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single();

    if (fetchError || !roleToDelete) {
        console.error('[ActionError:DeleteRole] Error fetching role or role not found:', fetchError?.message);
        return { error: "Role not found or database error." };
    }

    if (roleToDelete.name.toLowerCase() === 'admin') {
        return { error: "The 'admin' role cannot be deleted." };
    }

    const { count: userCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    if (countError) {
        console.error('[ActionError:DeleteRole] Supabase count error:', countError.message);
        return { error: "Database error: Could not count users with role." };
    }

    if (userCount && userCount > 0) {
      return { error: `Role is assigned to ${userCount} user(s). Please reassign them first.` };
    }

    // Primeiro, remover todas as permissões associadas
    const { error: deletePermissionsError } = await supabase
      .from('role_screen_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deletePermissionsError) {
      console.error('[ActionError:DeleteRole] Error deleting role permissions:', deletePermissionsError.message);
      return { error: "Database error: Could not delete role permissions." };
    }

    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      console.error('[ActionError:DeleteRole] Supabase delete error:', deleteError.message);
      return { error: "Database error: Could not delete role." };
    }

    revalidatePath('/admin/management/roles', 'page');
    return { success: true, message: "Role deleted successfully." };

  } catch (e: any) {
    console.error('[ActionError:DeleteRole] Unexpected error:', e.message);
    return { error: "An unexpected error occurred." };
  }
} 