-- Adicionar coluna is_master na tabela roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT false;

-- Criar tabela de telas do sistema (Definição Completa Restaurada)
CREATE TABLE IF NOT EXISTS screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  path VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de permissões de tela por role
CREATE TABLE IF NOT EXISTS role_screen_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE, -- Referência agora deve funcionar
  screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(role_id, screen_id)
);

-- Inserir telas padrão do sistema (COMENTADO - Inserir via app ou manualmente se necessário)
-- INSERT INTO screens (id, name, path, description, module) VALUES
--   (gen_random_uuid(), 'Dashboard', '/dashboard', 'Tela principal do sistema', 'Core'),
--   (gen_random_uuid(), 'Gerenciamento de Usuários', '/admin/management/users', 'Gerenciamento de usuários do sistema', 'Admin'),
--   (gen_random_uuid(), 'Gerenciamento de Funções', '/admin/management/roles', 'Gerenciamento de funções e permissões', 'Admin'),
--   (gen_random_uuid(), 'Configurações', '/admin/settings', 'Configurações do sistema', 'Admin')
-- ON CONFLICT DO NOTHING; -- Adicionado ON CONFLICT caso tente rodar de novo

-- Atualizar role admin para ser master
-- Adicionar IF EXISTS ou lógica para evitar erro se já for true?
UPDATE public.roles SET is_master = true WHERE name = 'admin';

-- Dar todas as permissões para a role admin (CUIDADO: Pode inserir duplicatas se rodar de novo)
-- Talvez precise de lógica de INSERT ... ON CONFLICT ... DO UPDATE/NOTHING aqui?
-- Por agora, vamos manter como está, assumindo que será rodado uma vez.
INSERT INTO public.role_screen_permissions (role_id, screen_id, can_view, can_edit, can_delete)
SELECT r.id, s.id, true, true, true
FROM public.roles r
CROSS JOIN public.screens s
WHERE r.name = 'admin'
ON CONFLICT (role_id, screen_id) DO NOTHING; -- Evitar erro se já existir 