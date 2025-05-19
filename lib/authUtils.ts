import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface RoleWithName {
  name: string;
}

// Define a interface para Role com suas permissões de tela
export interface RoleWithPermissions {
  id: string;
  name: string;
  is_master: boolean;
  role_screen_permissions: {
    screen: {
      path: string;
    };
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[];
}

interface ProfileWithRoleName {
  role: RoleWithName;
}

interface ProfileWithRolePermissions {
  role: RoleWithPermissions;
}

export async function isAdmin(supabase = createClient()) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role:roles(name)')
    .eq('id', user.id)
    .single() as { data: ProfileWithRoleName | null };

  return profile?.role?.name?.toLowerCase() === 'admin';
}

export async function hasScreenPermission(
  screenPath: string,
  permission: 'view' | 'edit' | 'delete',
  supabase = createClient()
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Buscar o perfil do usuário com sua role
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      role:roles (
        id,
        name,
        is_master,
        role_screen_permissions (
          screen:screen_id (
            path
          ),
          can_view,
          can_edit,
          can_delete
        )
      )
    `)
    .eq('id', user.id)
    .single() as { data: ProfileWithRolePermissions | null };

  if (!profile?.role) return false;

  // Se a role for master, tem acesso a tudo
  if (profile.role.is_master) return true;

  // Buscar a permissão específica para a tela
  const screenPermission = profile.role.role_screen_permissions.find(
    (p) => p.screen.path === screenPath
  );

  if (!screenPermission) return false;

  // Verificar a permissão específica
  switch (permission) {
    case 'view':
      return screenPermission.can_view;
    case 'edit':
      return screenPermission.can_edit;
    case 'delete':
      return screenPermission.can_delete;
    default:
      return false;
  }
} 