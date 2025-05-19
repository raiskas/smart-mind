export interface Screen {
  id: string;
  name: string;
  path: string;
  description: string;
  module: string;
}

export interface ScreenPermission {
  screenId: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface Role {
  id: string;
  name: string;
  isMaster: boolean;
  screenPermissions: ScreenPermission[];
}

// Lista de todas as telas do sistema
export const SYSTEM_SCREENS: Screen[] = [
  {
    id: '0f5880ad-e6e9-4d5f-ae03-4a789278475a',
    name: 'Dashboard',
    path: '/dashboard',
    description: 'Tela principal do sistema',
    module: 'Core'
  },
  {
    id: 'a80ff3ad-8819-44a3-9908-66462ccb0a2d',
    name: 'Gerenciamento de Usuários',
    path: '/admin/management/users',
    description: 'Gerenciamento de usuários do sistema',
    module: 'Admin'
  },
  {
    id: 'b7ec24b3-1c8f-4041-afb5-a2f875cf7ca8',
    name: 'Gerenciamento de Funções',
    path: '/admin/management/roles',
    description: 'Gerenciamento de funções e permissões',
    module: 'Admin'
  },
  {
    id: '80ac62c4-6424-4436-a9a2-689a3eff21b3',
    name: 'Configurações',
    path: '/admin/settings',
    description: 'Configurações do sistema',
    module: 'Admin'
  }
]; 