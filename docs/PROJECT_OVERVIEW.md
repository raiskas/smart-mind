# Visão Geral do Projeto: Smart Mind App

## 1. Introdução

O "Smart Mind App" é uma aplicação web construída com Next.js e Supabase, projetada para fornecer uma plataforma com gerenciamento de usuários, controle de acesso baseado em funções (roles) e permissões granulares por tela. O sistema suporta internacionalização e possui uma interface de administração para gerenciar usuários e suas respectivas funções e permissões.

## 2. Stack de Tecnologias

*   **Framework Frontend/Backend:** Next.js 14.x (com App Router)
*   **Backend como Serviço (BaaS):** Supabase
    *   Autenticação (Supabase Auth)
    *   Banco de Dados (Supabase Postgres)
    *   Armazenamento (não utilizado explicitamente até o momento, mas disponível)
*   **Linguagem:** TypeScript
*   **Estilização:**
    *   Tailwind CSS
    *   Shadcn/UI (para componentes de UI pré-construídos e estilizáveis)
    *   `next-themes` (para alternância de tema claro/escuro)
*   **Internacionalização (i18n):** `next-intl`
*   **Validação de Schema:** Zod
*   **Gerenciador de Pacotes:** pnpm
*   **Linting:** ESLint
*   **Formatação:** Prettier

## 3. Estrutura do Projeto

A estrutura do projeto segue as convenções do Next.js App Router:

```
smart-mind-app/
├── app/                            # Diretório principal do App Router
│   ├── [locale]/                   # Rotas internacionalizadas
│   │   ├── admin/                  # Rotas de administração
│   │   │   └── management/
│   │   │       ├── financials/
│   │   │       │   └── transactions/ # Gerenciamento de Transações
│   │   │       ├── roles/          # Gerenciamento de Funções (Roles)
│   │   │       └── users/          # Gerenciamento de Usuários
│   │   ├── dashboard/              # Página de dashboard pós-login
│   │   ├── login/                  # Página de login
│   │   └── layout.tsx              # Layout principal para rotas com locale
│   │   └── page.tsx                # Página raiz para um locale
│   ├── actions/                    # Server Actions (lógica de backend)
│   │   ├── roleActions.ts
│   │   ├── transactionActions.ts   # Actions para Transações
│   │   └── userActions.ts
│   └── layout.tsx                  # Layout raiz da aplicação (pode não existir ou ser simples)
├── components/                     # Componentes React reutilizáveis
│   ├── admin/                      # Componentes específicos da área de admin
│   ├── ui/                         # Componentes Shadcn/UI (geralmente)
│   ├── Header.tsx                  # Componente de Cabeçalho
│   ├── ClientLogoutButton.tsx      # Botão de logout (Client Component)
│   ├── LanguageSwitcher.tsx        # Componente para trocar idioma
│   └── ThemeToggle.tsx             # Componente para trocar tema
├── lib/                            # Funções utilitárias e configuração de bibliotecas
│   ├── authUtils.ts                # Utilitários de autenticação (ex: isAdmin)
│   ├── constants/
│   │   └── financial.ts
│   ├── schemas/                # Schemas Zod para validação
│   │   ├── company.ts
│   │   ├── financialAccount.ts
│   │   ├── role.ts
│   │   ├── transaction.ts      # Schema para Transações
│   │   └── user.ts
│   └── supabase/                   # Configuração dos clientes Supabase
│       ├── client.ts               # Cliente Supabase para o lado do cliente
│       ├── server.ts               # Cliente Supabase para Server Components/Actions
│       └── service.ts              # Cliente Supabase com Service Role Key
├── messages/                       # Arquivos JSON com traduções por locale
│   ├── en-US.json
│   ├── es.json
│   └── pt-BR.json
├── public/                         # Assets estáticos
├── supabase/                       # Arquivos relacionados ao Supabase CLI (ex: migrations)
│   └── migrations/                 # Migrações do banco de dados SQL
├── docs/                           # Pasta para esta documentação
│   └── PROJECT_OVERVIEW.md
├── .env.local                      # Arquivo para variáveis de ambiente (NÃO COMMITAR)
├── i18n.ts                         # Configuração principal do next-intl
├── middleware.ts                   # Middleware para autenticação e internacionalização
├── navigation.ts                   # Configuração de navegação tipada do next-intl
├── next.config.mjs                 # Configuração do Next.js
├── package.json                    # Dependências e scripts do projeto
├── tailwind.config.ts              # Configuração do Tailwind CSS
└── tsconfig.json                   # Configuração do TypeScript
```

## 4. Configuração e Uso do Projeto

### 4.1. Pré-requisitos

*   Node.js (versão recomendada pelo Next.js 14, ex: >=18.17)
*   pnpm (gerenciador de pacotes)
*   Uma conta Supabase e um projeto criado.

### 4.2. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis, substituindo pelos seus valores do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=SUA_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SUPABASE_SERVICE_ROLE_KEY
```

*   `NEXT_PUBLIC_SUPABASE_URL`: A URL do seu projeto Supabase.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: A chave anônima pública (anon key) do seu projeto Supabase.
*   `SUPABASE_SERVICE_ROLE_KEY`: A chave de serviço (service role key) do seu projeto Supabase. Esta chave tem privilégios de administrador e deve ser mantida em segredo.

### 4.3. Instalação de Dependências

Clone o repositório e instale as dependências usando pnpm:

```bash
pnpm install
```

### 4.4. Configuração do Banco de Dados Supabase

As migrações SQL necessárias para as tabelas personalizadas (`profiles`, `roles`, `screens`, `role_screen_permissions`) estão na pasta `supabase/migrations/`. Essas migrações devem ser aplicadas ao seu banco de dados Supabase. Se você estiver começando um novo projeto Supabase, pode executar essas migrações através da UI do Supabase (SQL Editor) ou usando o Supabase CLI.

**Tabelas Principais:**
*   `profiles`: Armazena dados adicionais dos usuários (linkado com `auth.users` do Supabase), incluindo `role_id`.
*   `roles`: Define as funções (ex: admin, user) com um ID (UUID) e nome.
*   `screens`: Define as diferentes telas/seções do sistema que podem ter permissões associadas.
*   `role_screen_permissions`: Tabela de junção que define as permissões CRUD (Create, Read, Update, Delete) para cada `role` em cada `screen`.

### 4.5. Rodando o Projeto em Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`.

### 4.6. Build para Produção

Para criar uma build otimizada para produção:

```bash
pnpm build
```

E para iniciar o servidor de produção:

```bash
pnpm start
```

### 4.7. Linting e Formatação

Para verificar erros de linting:
```bash
pnpm lint
```
Para corrigir automaticamente erros de linting:
```bash
pnpm lint:fix
```
Para formatar o código usando Prettier:
```bash
pnpm format
```
Para verificar a formatação:
```bash
pnpm format:check
```

## 5. Funcionalidades Principais

### 5.1. Autenticação
*   Login de usuários com email e senha.
*   Interface de login fornecida por `@supabase/auth-ui-react`.
*   Gerenciamento de sessão via Supabase Auth, integrado com Next.js usando `@supabase/ssr`.
*   Logout de usuários.
*   O `middleware.ts` protege rotas e redireciona usuários não autenticados para a página de login.

### 5.2. Internacionalização (i18n)
*   Suporte para múltiplos idiomas (pt-BR, en-US, es) usando `next-intl`.
*   Traduções armazenadas em arquivos JSON na pasta `messages/`.
*   Configuração em `i18n.ts` e `navigation.ts`.
*   Seleção de idioma via componente `LanguageSwitcher`.

### 5.3. Gerenciamento de Usuários (Área de Admin)
*   Local: `/admin/management/users` (ou URL traduzida).
*   Administradores podem:
    *   Visualizar a lista de usuários.
    *   Criar novos usuários (definindo email, senha, nome de usuário, nome completo e função).
    *   Editar usuários existentes (atualizando nome de usuário, nome completo e função).
    *   Excluir usuários.
*   As operações são realizadas via Server Actions em `app/actions/userActions.ts`.
*   Os formulários de criação/edição são apresentados em modais.

### 5.4. Gerenciamento de Funções e Permissões (Área de Admin)
*   Local: `/admin/management/roles` (ou URL traduzida).
*   Administradores podem:
    *   Visualizar a lista de funções.
    *   Criar novas funções (definindo nome e se é uma função de administrador).
    *   Editar funções existentes, incluindo a atribuição de permissões granulares por tela.
    *   Excluir funções.
*   **Permissões Granulares:** Para cada função, é possível definir permissões de Criar (C), Ler (R), Atualizar (U) e Deletar (D) para cada tela do sistema (definida na tabela `screens`).
*   As operações são realizadas via Server Actions em `app/actions/roleActions.ts`.
*   Os formulários de criação/edição são apresentados em modais.

### 5.5. Gerenciamento de Transações Financeiras (Área de Admin)
*   Local: `/admin/management/financials/transactions` (ou URL traduzida).
*   Usuários podem:
    *   Visualizar a lista de transações com filtros básicos.
    *   Criar novas transações (receitas, despesas) através de um modal.
        *   Seleção de conta financeira, categoria (opcional), data, descrição, valor.
        *   A moeda é preenchida automaticamente com base na conta financeira.
    *   Editar transações existentes.
    *   Excluir transações com confirmação.
*   As operações são realizadas via Server Actions em `app/actions/transactionActions.ts`.
*   Validação de dados com Zod em `app/lib/schemas/transaction.ts`.
*   Problemas iniciais com internacionalização, manipulação de datas, e referências a colunas inexistentes (ex: `contact_id`) foram resolvidos.

## 6. Conceitos Chave da Arquitetura

### 6.1. Next.js App Router
*   A estrutura de arquivos em `app/` define as rotas.
*   Uso de Server Components (padrão) para buscar dados e renderizar no servidor, e Client Components (`'use client'`) para interatividade no lado do cliente.
*   Layouts (`layout.tsx`) para estruturas de UI compartilhadas.
*   Páginas (`page.tsx`) para o conteúdo específico de cada rota.

### 6.2. Server Actions
*   Funções assíncronas executadas no servidor, chamadas a partir de Client Components (geralmente em formulários) ou Server Components.
*   Usadas para todas as mutações de dados (criar, atualizar, deletar).
*   Definidas em `app/actions/`.
*   Utilizam Zod para validação dos dados de entrada.
*   Utilizam `revalidatePath` ou `revalidateTag` do Next.js para atualizar o cache e refletir as mudanças na UI.

### 6.3. Integração com Supabase
*   **Cliente Supabase no Lado do Cliente (`lib/supabase/client.ts`):** Usado em Client Components para interações que não exigem privilégios de admin (ex: UI de login).
*   **Cliente Supabase no Lado do Servidor (`lib/supabase/server.ts`):** Usado em Server Components e Server Actions para buscar dados ou realizar operações autenticadas como o usuário logado. Criado usando `@supabase/ssr` para gerenciamento de cookies.
*   **Cliente Supabase com Service Role (`lib/supabase/service.ts`):** Usado em Server Actions que necessitam de privilégios de administrador para bypassar RLS (Row Level Security) ou realizar operações administrativas (ex: criar/deletar usuários no Auth, modificar perfis diretamente). Requer a variável de ambiente `SUPABASE_SERVICE_ROLE_KEY`.
*   O `middleware.ts` usa `@supabase/ssr` para obter a sessão do usuário a cada requisição.

### 6.4. Estilização e UI
*   **Tailwind CSS:** Framework CSS utility-first para estilização rápida.
*   **Shadcn/UI:** Coleção de componentes de UI reutilizáveis, construídos sobre Tailwind CSS e Radix UI. Os componentes são adicionados ao projeto (geralmente em `components/ui/`) e podem ser personalizados.
*   **Temas:** Suporte a tema claro e escuro usando `next-themes` e o componente `ThemeToggle`.

## 7. Modelo de Dados (Visão Geral Inferida)

*   **`auth.users` (Supabase Auth):** Tabela gerenciada pelo Supabase para informações de autenticação (email, senha hash, id do usuário, etc.).
*   **`public.profiles`:**
    *   `id` (UUID, chave primária, FK para `auth.users.id`)
    *   `email` (TEXT)
    *   `username` (TEXT, opcional)
    *   `full_name` (TEXT, opcional)
    *   `role_id` (UUID, FK para `public.roles.id`)
    *   `created_at`, `updated_at` (TIMESTAMPTZ)
*   **`public.roles`:**
    *   `id` (UUID, chave primária)
    *   `name` (TEXT, único)
    *   `is_admin` (BOOLEAN, default `false`)
    *   `created_at`, `updated_at` (TIMESTAMPTZ)
*   **`public.screens`:**
    *   `id` (UUID, chave primária)
    *   `name` (TEXT, identificador da tela, ex: "User Management")
    *   `path` (TEXT, caminho da tela, ex: "/admin/management/users", único)
    *   `created_at`, `updated_at` (TIMESTAMPTZ)
*   **`public.role_screen_permissions`:**
    *   `id` (UUID, chave primária)
    *   `role_id` (UUID, FK para `public.roles.id`)
    *   `screen_id` (UUID, FK para `public.screens.id`)
    *   `can_create` (BOOLEAN, default `false`)
    *   `can_read` (BOOLEAN, default `false`)
    *   `can_update` (BOOLEAN, default `false`)
    *   `can_delete` (BOOLEAN, default `false`)
    *   `created_at`, `updated_at` (TIMESTAMPTZ)
    *   Restrição UNIQUE em (`role_id`, `screen_id`)

## 8. Considerações Adicionais

*   **Segurança:** A utilização da `SUPABASE_SERVICE_ROLE_KEY` deve ser feita com cautela e apenas em Server Actions, nunca expondo-a ao cliente.
*   **Validação:** Zod é usado para validar os dados de formulários nas Server Actions, o que é uma boa prática.
*   **Estado do Usuário no Cliente:** A atualização do estado do usuário no cliente (especialmente no `Header` após login/logout) parece ser um ponto que exigiu atenção, com soluções envolvendo `router.refresh()` e a ordem das chamadas de navegação.
*   **Migrações:** Manter as migrações do banco de dados (`supabase/migrations/`) atualizadas é crucial para a consistência entre ambientes.

Este documento deve servir como um bom ponto de partida para a equipe entender o projeto. Recomenda-se mantê-lo atualizado à medida que o projeto evolui. 