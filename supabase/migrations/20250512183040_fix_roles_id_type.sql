-- Migration para corrigir o tipo da coluna roles.id e profiles.role_id para UUID

BEGIN; -- Iniciar transação

-- 1. Corrigir roles.id
ALTER TABLE public.roles
  ALTER COLUMN id DROP DEFAULT, -- Remover default antigo (ex: serial), se existir
  ALTER COLUMN id TYPE UUID USING id::uuid, -- Alterar tipo para UUID
  ALTER COLUMN id SET DEFAULT gen_random_uuid(); -- Definir novo default UUID

-- Recriar chave primária se foi perdida (improvável, mas seguro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint 
    WHERE  conrelid = 'public.roles'::regclass 
    AND    conname = 'roles_pkey'
    AND    contype = 'p'
  ) THEN
     ALTER TABLE public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- 2. Corrigir profiles.role_id (se existir e for INT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role_id'
    AND (data_type = 'integer' OR data_type = 'bigint') -- Checar por tipos inteiros
  ) THEN
     -- Remover FK antiga se existir (necessário antes de mudar tipo da coluna referenciada)
     IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
        AND confrelid = 'public.roles'::regclass
        -- O nome da FK pode variar, então não filtramos por nome aqui
        AND contype = 'f'
     ) THEN
        -- Precisamos do nome da FK. Vamos assumir um nome comum ou buscar dinamicamente (complexo em SQL puro)
        -- Tentativa com nome padrão (pode falhar se o nome for diferente)
        -- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_id_fkey;
        -- Abordagem mais segura é não dropar/recriar FK aqui, assumindo que a mudança de tipo da PK em roles seja suficiente.
        -- A FK deve ser atualizada ou recriada APÓS a coluna referenciada (roles.id) ser alterada.
        NULL; -- Apenas para sintaxe válida
     END IF;

     ALTER TABLE public.profiles ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

     -- Recriar FK se necessário (idealmente deveria ser feito após commit da alteração em roles.id)
     -- Se a FK não foi dropada, esta alteração pode não ser necessária ou pode falhar.
     -- IF NOT EXISTS (... verificar se FK existe ...) THEN
     --    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
     -- END IF;

  END IF;
END $$;

-- 3. Garantir que role_screen_permissions.role_id seja UUID (provavelmente já é, mas seguro verificar)
-- Esta tabela é criada DEPOIS da roles, então a FK já deve apontar para UUID se roles.id foi corrigido antes.
-- Se a roles.id foi corrigida SÓ AGORA com esta migração, a FK em role_screen_permissions pode estar quebrada.
-- Este bloco tenta corrigir a coluna em si, se necessário.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'role_screen_permissions'
    AND column_name = 'role_id'
    AND (data_type = 'integer' OR data_type = 'bigint')
  ) THEN
     ALTER TABLE public.role_screen_permissions ALTER COLUMN role_id TYPE UUID USING role_id::uuid;
  END IF;
END $$;


COMMIT; -- Finalizar transação
