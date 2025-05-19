# Estrutura do Banco de Dados: Smart Mind App

## 1. Introdução

Este documento descreve a estrutura do banco de dados PostgreSQL utilizado pela aplicação "Smart Mind App", hospedado no Supabase. Ele detalha as tabelas personalizadas criadas para o projeto no schema `public`, seus campos, relacionamentos e o propósito de cada uma, bem como sua interação com a tabela `auth.users` gerenciada pelo Supabase.

O Supabase gerencia internamente o schema `auth` (que inclui `auth.users` e muitas outras tabelas) para fins de autenticação. As tabelas personalizadas aqui descritas residem no schema `public`.

## 2. Diagrama de Relacionamento (Conceitual Focado no Schema `public`)

```mermaid
erDiagram
    auth.users ||--o{ public.profiles : "tem perfil"
    public.roles ||--o{ public.profiles : "é atribuída a"
    public.roles ||--|{ public.role_screen_permissions : "tem permissões em"
    public.screens ||--|{ public.role_screen_permissions : "pode ter permissões para"
    public.companies ||--o{ public.profiles : "pertence a"
    public.companies ||--|{ public.financial_accounts : "possui"
    public.companies ||--|{ public.transaction_categories : "possui"
    public.companies ||--|{ public.transactions : "registra"
    public.companies ||--|{ public.recurring_transactions : "define"
    public.currencies ||--|{ public.companies : "usa como padrão"
    public.currencies ||--|{ public.financial_accounts : "usa"
    public.currencies ||--|{ public.transactions : "usa"
    public.currencies ||--|{ public.recurring_transactions : "usa"
    public.financial_accounts ||--o{ public.transactions : "tem transações em"
    public.transaction_categories ||--o{ public.transactions : "classifica"
    public.transaction_categories ||--o{ public.transaction_categories : "é pai de"
    public.financial_accounts ||--o{ public.recurring_transactions : "usa como base"
    public.transaction_categories ||--o{ public.recurring_transactions : "usa como base"
    public.profiles ||--o{ public.transactions : "criou"


    auth.users {
        UUID id PK
        string email
        timestamp email_confirmed_at
        timestamp last_sign_in_at
        jsonb raw_app_meta_data
        jsonb raw_user_meta_data
        varchar "role" "Supabase internal role"
        boolean is_super_admin "Supabase internal superadmin"
        ...
    }

    public.profiles {
        UUID id PK, FK "auth.users.id"
        text email
        text username
        text full_name
        UUID role_id FK "public.roles.id"
        UUID company_id FK "public.companies.id"
        timestamptz created_at
        timestamptz updated_at
    }

    public.roles {
        UUID id PK
        text name UK
        boolean is_admin "Custom admin flag for application logic"
        timestamptz created_at
        timestamptz updated_at
    }

    public.screens {
        UUID id PK
        text name
        text path UK
        timestamptz created_at
        timestamptz updated_at
    }

    public.role_screen_permissions {
        UUID id PK
        UUID role_id FK "public.roles.id"
        UUID screen_id FK "public.screens.id"
        boolean can_create
        boolean can_read
        boolean can_update
        boolean can_delete
        timestamptz created_at
        timestamptz updated_at
        UK (role_id, screen_id)
    }

    public.companies {
        UUID id PK
        text name UK
        text official_name
        text tax_id
        UUID default_currency_id FK "public.currencies.id"
        timestamptz created_at
        timestamptz updated_at
    }

    public.currencies {
        UUID id PK
        varchar(3) code UK
        text name
        varchar(5) symbol
        int decimal_places
        timestamptz created_at
        timestamptz updated_at
    }

    public.financial_accounts {
        UUID id PK
        UUID company_id FK "public.companies.id"
        text name
        text account_type "Ex: CHECKING_ACCOUNT, SAVINGS_ACCOUNT"
        text account_number
        numeric initial_balance
        UUID currency_id FK "public.currencies.id"
        boolean is_active
        text bank_name
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    public.transaction_categories {
        UUID id PK
        UUID company_id FK "public.companies.id"
        text name
        text type "CHECK (income, expense)"
        UUID parent_category_id FK "public.transaction_categories.id" (NULLABLE)
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        UK (company_id, name, type)
    }

    public.transactions {
        UUID id PK
        UUID company_id FK "public.companies.id"
        UUID financial_account_id FK "public.financial_accounts.id"
        UUID category_id FK "public.transaction_categories.id" (NULLABLE)
        UUID currency_id FK "public.currencies.id"
        text type "CHECK (income, expense, transfer)"
        text description
        numeric amount
        timestamptz transaction_date
        timestamptz due_date (NULLABLE)
        timestamptz payment_date (NULLABLE)
        text status "CHECK (pending, paid, received, cancelled, overdue, scheduled)"
        text payment_method (NULLABLE)
        text document_number (NULLABLE)
        text notes (NULLABLE)
        text cost_center (NULLABLE)
        text project (NULLABLE)
        UUID created_by_user_id FK "public.profiles.id" (NULLABLE)
        UUID related_transaction_id FK "public.transactions.id" (NULLABLE)
        UUID contact_id FK "public.contacts.id" (NULLABLE)
        timestamptz created_at DEFAULT now()
        timestamptz updated_at DEFAULT now()
    }

    public.recurring_transactions {
        UUID id PK
        UUID company_id FK "public.companies.id"
        text description
        text base_transaction_type "CHECK (income, expense)"
        UUID financial_account_id FK "public.financial_accounts.id"
        UUID category_id FK "public.transaction_categories.id"
        UUID currency_id FK "public.currencies.id"
        numeric base_amount
        text recurrence_rule
        timestamptz start_date
        timestamptz end_date
        timestamptz next_due_date
        text status "CHECK (active, paused, finished)"
        boolean auto_create_transaction
        int days_before_due_to_create
        text cost_center
        text project
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
```
*Nota: O diagrama Mermaid acima é uma representação conceitual e pode precisar de ajustes para renderização correta dependendo do visualizador. Ele foca nas tabelas do schema `public` e sua relação com `auth.users`.* 

## 3. Detalhamento das Tabelas

### 3.1. `auth.users` (Gerenciada pelo Supabase)

*   **Propósito:** Armazena as informações centrais de autenticação dos usuários (email, senha hash, status de confirmação, metadados, etc.). É a fonte primária para identificação de usuários.
*   **Chave Primária:** `id` (UUID)
*   **Campos Relevantes para o Projeto (Exemplos):**
    *   `id` (UUID): Identificador único global do usuário, usado como chave estrangeira na tabela `public.profiles`.
    *   `email` (VARCHAR): Email do usuário.
    *   `encrypted_password` (VARCHAR): Hash da senha do usuário.
    *   `email_confirmed_at` (TIMESTAMPTZ): Timestamp de quando o email do usuário foi confirmado. Se `null`, o email não foi confirmado.
    *   `invited_at` (TIMESTAMPTZ): Timestamp de quando um convite foi enviado.
    *   `confirmation_token` (VARCHAR): Token usado para confirmação de email.
    *   `confirmation_sent_at` (TIMESTAMPTZ): Timestamp de quando o email de confirmação foi enviado.
    *   `recovery_token` (VARCHAR): Token usado para recuperação de senha.
    *   `recovery_sent_at` (TIMESTAMPTZ): Timestamp de quando o email de recuperação foi enviado.
    *   `last_sign_in_at` (TIMESTAMPTZ): Timestamp do último login bem-sucedido.
    *   `raw_app_meta_data` (JSONB): Metadados específicos da aplicação, não específicos do usuário (ex: `provider`, `providers`). Pode conter a(s) role(s) internas do Supabase.
    *   `raw_user_meta_data` (JSONB): Metadados personalizados que podem ser definidos para o usuário (ex: nome de avatar, preferências). *No nosso projeto, preferimos usar a tabela `public.profiles` para dados de perfil customizados.*
    *   `role` (VARCHAR): Campo interno do Supabase para sua própria gestão de roles (ex: `authenticated`, `anon`). **Não confundir com `public.roles.name` da nossa aplicação.**
    *   `is_super_admin` (BOOLEAN): Flag interna do Supabase para super administradores do projeto Supabase. **Não é usado diretamente pela lógica da nossa aplicação para permissões customizadas.**
    *   Outros campos gerenciados pelo Supabase Auth (ex: `phone`, `created_at`, `updated_at`, `deleted_at`).
*   **Observação:** O schema `auth` do Supabase contém muitas outras tabelas (ex: `sessions`, `identities`, `mfa_factors`) que lidam com aspectos mais detalhados da autenticação. Para um entendimento completo dessas tabelas internas, consulte a documentação oficial do Supabase. Nossa documentação foca na interação com `auth.users` e nas tabelas customizadas no schema `public`.

### 3.2. `public.profiles`

*   **Propósito:** Estende a tabela `auth.users` com informações de perfil adicionais e específicas da aplicação, incluindo a atribuição de uma função (role) customizada da nossa aplicação.
*   **Chave Primária:** `id` (UUID)
*   **Relacionamentos:**
    *   Liga-se à `auth.users` através da coluna `id` (relação um-para-um).
    *   Liga-se à `public.roles` através da coluna `role_id`.
*   **Campos:**
    *   `id` (UUID, PK): Chave primária, corresponde ao `id` da tabela `auth.users`.
    *   `email` (TEXT, NOT NULL): Email do usuário (pode ser duplicado do `auth.users` para facilitar queries, mas a fonte da verdade para autenticação é `auth.users`).
    *   `username` (TEXT, NULLABLE): Nome de usuário escolhido pelo usuário ou admin.
    *   `full_name` (TEXT, NULLABLE): Nome completo do usuário.
    *   `role_id` (UUID, NULLABLE, FK para `public.roles.id`): Identificador da função atribuída a este usuário. Se `null`, o usuário não tem uma função específica atribuída (o que pode ser um estado a ser evitado ou tratado na lógica da aplicação).
    *   `company_id` (UUID, NULLABLE, FK para `public.companies.id`): A empresa à qual este perfil de usuário está associado.
    *   `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da criação do perfil.
    *   `updated_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da última atualização do perfil.

### 3.3. `public.roles`

*   **Propósito:** Define as diferentes funções (ou papéis) que os usuários podem ter no sistema, como "admin", "editor", "visualizador", etc. Estas são as roles da **nossa aplicação**.
*   **Chave Primária:** `id` (UUID)
*   **Campos:**
    *   `id` (UUID, PK): Identificador único da função.
    *   `name` (TEXT, NOT NULL, UNIQUE): Nome da função (ex: "admin", "gerente de conteúdo"). Deve ser único.
    *   `is_admin` (BOOLEAN, NOT NULL, DEFAULT `false`): Uma flag para identificar rapidamente se esta é uma função com amplos privilégios na **nossa aplicação**. (Pode ser complementar ou parcialmente sobreposta pelas permissões granulares).
    *   `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da criação da função.
    *   `updated_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da última atualização da função.

### 3.4. `public.screens`

*   **Propósito:** Cataloga as diferentes telas, seções ou recursos da aplicação para os quais permissões de acesso podem ser definidas.
*   **Chave Primária:** `id` (UUID)
*   **Campos:**
    *   `id` (UUID, PK): Identificador único da tela.
    *   `name` (TEXT, NOT NULL): Um nome legível para a tela (ex: "Gerenciamento de Usuários", "Dashboard Principal"). Usado na UI de gerenciamento de permissões.
    *   `path` (TEXT, NOT NULL, UNIQUE): Um identificador de caminho único para a tela (ex: `/admin/management/users`, `/dashboard`). Usado programaticamente para associar permissões.
    *   `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da criação do registro da tela.
    *   `updated_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da última atualização do registro da tela.

### 3.5. `public.role_screen_permissions`

*   **Propósito:** Tabela de junção que define as permissões específicas de uma `role` para uma `screen` particular. Permite controle de acesso granular (CRUD).
*   **Chave Primária:** `id` (UUID) - Embora uma chave composta (`role_id`, `screen_id`) também garanta unicidade.
*   **Relacionamentos:**
    *   Liga-se à `public.roles` via `role_id`.
    *   Liga-se à `public.screens` via `screen_id`.
*   **Restrições:** UNIQUE (`role_id`, `screen_id`) para garantir que uma função só tenha um conjunto de permissões por tela.
*   **Campos:**
    *   `id` (UUID, PK): Identificador único da entrada de permissão.
    *   `role_id` (UUID, NOT NULL, FK para `public.roles.id`): A função à qual esta permissão se aplica.
    *   `screen_id` (UUID, NOT NULL, FK para `public.screens.id`): A tela à qual esta permissão se aplica.
    *   `can_create` (BOOLEAN, NOT NULL, DEFAULT `false`): Se a função pode criar itens na tela.
    *   `can_read` (BOOLEAN, NOT NULL, DEFAULT `false`): Se a função pode visualizar/ler dados na tela.
    *   `can_update` (BOOLEAN, NOT NULL, DEFAULT `false`): Se a função pode atualizar itens na tela.
    *   `can_delete` (BOOLEAN, NOT NULL, DEFAULT `false`): Se a função pode deletar itens na tela.
    *   `created_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da criação da permissão.
    *   `updated_at` (TIMESTAMPTZ, DEFAULT `now()`): Timestamp da última atualização da permissão.

### 3.6. `public.companies`

*   **Propósito:** Armazena informações sobre as diferentes empresas que utilizam o sistema, permitindo uma arquitetura multiempresa. Cada empresa terá seus próprios dados financeiros isolados.
*   **Chave Primária:** `id` (UUID)
*   **Campos:**
    *   `id` (UUID, PK, DEFAULT `gen_random_uuid()`): Identificador único da empresa.
    *   `name` (TEXT, NOT NULL, UNIQUE): Nome fantasia ou comum da empresa.
    *   `official_name` (TEXT, NULLABLE): Razão Social ou nome oficial da empresa.
    *   `tax_id` (TEXT, NULLABLE): Identificador fiscal da empresa (ex: CNPJ no Brasil, EIN nos EUA).
    *   `default_currency_id` (UUID, NULLABLE, FK para `public.currencies.id`): Moeda padrão para transações e relatórios desta empresa.
    *   `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da criação do registro da empresa.
    *   `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da última atualização do registro da empresa.

### 3.7. `public.currencies`

*   **Propósito:** Armazena as moedas suportadas pelo sistema, com seus códigos, nomes e símbolos.
*   **Chave Primária:** `id` (UUID)
*   **Campos:**
    *   `id` (UUID, PK, DEFAULT `gen_random_uuid()`): Identificador único da moeda.
    *   `code` (VARCHAR(3), NOT NULL, UNIQUE): Código ISO 4217 da moeda (ex: "USD", "BRL").
    *   `name` (TEXT, NOT NULL): Nome por extenso da moeda (ex: "US Dollar", "Real Brasileiro").
    *   `symbol` (VARCHAR(5), NULLABLE): Símbolo da moeda (ex: "$", "R$").
    *   `decimal_places` (INT, NOT NULL, DEFAULT 2): Número de casas decimais usadas pela moeda.
    *   `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da criação do registro da moeda.
    *   `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da última atualização do registro da moeda.

### 3.8. `public.financial_accounts`

*   **Propósito:** Armazena as contas financeiras de cada empresa, como contas bancárias, caixas, cartões de crédito, etc.
*   **Chave Primária:** `id` (UUID)
*   **Relacionamentos:**
    *   Liga-se à `public.companies` via `company_id`.
    *   Liga-se à `public.currencies` via `currency_id`.
*   **Campos:**
    *   `id` (UUID, PK, DEFAULT `gen_random_uuid()`): Identificador único da conta financeira.
    *   `company_id` (UUID, NOT NULL, FK para `public.companies.id`): Empresa à qual esta conta pertence.
    *   `name` (TEXT, NOT NULL): Nome descritivo da conta (ex: "Conta Corrente Banco X", "Caixa Principal").
    *   `account_type` (TEXT, NOT NULL): Tipo da conta financeira. Valores definidos em `app/lib/constants/financial.ts` (ex: 'CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'OTHER'). Originalmente 'type', renomeada para 'account_type'.
    *   `account_number` (TEXT, NULLABLE): Número da conta (pode ser parcial ou mascarado para exibição).
    *   `initial_balance` (DECIMAL(18, 2), NOT NULL, DEFAULT 0.00): Saldo inicial da conta na data de sua criação ou registro no sistema.
    *   `currency_id` (UUID, NOT NULL, FK para `public.currencies.id`): Moeda desta conta financeira.
    *   `is_active` (BOOLEAN, NOT NULL, DEFAULT TRUE): Indica se a conta está ativa.
    *   `bank_name` (TEXT, NULLABLE): Nome do banco, se aplicável. Adicionada posteriormente à V1.
    *   `description` (TEXT, NULLABLE): Descrição ou notas adicionais sobre a conta. Adicionada posteriormente à V1.
    *   `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da criação do registro da conta.
    *   `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da última atualização do registro da conta.
    *   *(Campos condicionais como `card_network`, `card_last_four_digits`, `credit_limit`, `statement_closing_date`, `payment_due_date` foram implementados no formulário e schema Zod, mas não foram adicionados como colunas no banco na migração V1. Se necessários, devem ser adicionados via novas migrações.)*

### 3.9. `public.transaction_categories`

*   **Propósito:** Permite que as empresas categorizem suas transações (receitas e despesas) de forma hierárquica.
*   **Chave Primária:** `id` (UUID)
*   **Relacionamentos:**
    *   Liga-se à `public.companies` via `company_id`.
    *   Pode ter um auto-relacionamento via `parent_category_id` para hierarquia.
*   **Campos:**
    *   `id` (UUID, PK, DEFAULT `gen_random_uuid()`): Identificador único da categoria.
    *   `company_id` (UUID, NOT NULL, FK para `public.companies.id`): Empresa à qual esta categoria pertence.
    *   `name` (TEXT, NOT NULL): Nome da categoria (ex: "Vendas de Software", "Material de Escritório").
    *   `type` (TEXT, NOT NULL, CHECK (`type` IN ('income', 'expense'))): Tipo da categoria (receita ou despesa).
    *   `parent_category_id` (UUID, NULLABLE, FK para `public.transaction_categories.id`): Categoria pai, para estrutura hierárquica.
    *   `is_active` (BOOLEAN, NOT NULL, DEFAULT TRUE): Indica se a categoria está ativa.
    *   `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da criação.
    *   `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`): Timestamp da atualização.
    *   UNIQUE (`company_id`, `name`, `type`): Garante que o nome da categoria seja único dentro de uma empresa para um determinado tipo.

### 3.10. `public.transactions`

*   **Propósito:** Armazena todos os lançamentos financeiros (receitas, despesas, transferências) das empresas.
*   **Chave Primária:** `id` (UUID)
*   **Relacionamentos:** Múltiplos FKs para `companies`, `financial_accounts`, `transaction_categories`, `currencies`, `profiles`, e auto-referência.
*   **Campos Principais (conforme V1):**
    *   `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
    *   `company_id` (UUID, NOT NULL, FK)
    *   `financial_account_id` (UUID, NOT NULL, FK)
    *   `category_id` (UUID, NULLABLE, FK)
    *   `currency_id` (UUID, NOT NULL, FK)
    *   `type` (TEXT, NOT NULL, CHECK (`type` IN ('income', 'expense', 'transfer')))
    *   `description` (TEXT, NOT NULL)
    *   `amount` (DECIMAL(18, 2), NOT NULL)
    *   `transaction_date` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
    *   `due_date` (TIMESTAMPTZ, NULLABLE)
    *   `payment_date` (TIMESTAMPTZ, NULLABLE)
    *   `status` (TEXT, NOT NULL, DEFAULT 'pending', CHECK (`status` IN ('pending', 'paid', 'received', 'overdue', 'cancelled', 'scheduled')))
    *   `payment_method` (TEXT, NULLABLE)
    *   `document_number` (TEXT, NULLABLE)
    *   `notes` (TEXT, NULLABLE)
    *   `cost_center` (TEXT, NULLABLE)
    *   `project` (TEXT, NULLABLE)
    *   `created_by_user_id` (UUID, NULLABLE, FK para `public.profiles.id`)
    *   `related_transaction_id` (UUID, NULLABLE, FK para `public.transactions.id` para transferências)
    *   `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
    *   `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)

### 3.11. `public.recurring_transactions`

*   **Propósito:** Define modelos para transações que ocorrem periodicamente, permitindo a automação ou lembrete de lançamentos futuros.
*   **Chave Primária:** `id` (UUID)
*   **Relacionamentos:** Similar a `transactions`.
*   **Campos Principais (conforme V1):**
    *   `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
    *   `company_id` (UUID, NOT NULL, FK)
    *   `description` (TEXT, NOT NULL)
    *   `base_transaction_type` (TEXT, NOT NULL, CHECK (`base_transaction_type` IN ('income', 'expense')))
    *   `financial_account_id` (UUID, NOT NULL, FK)
    *   `category_id` (UUID, NULLABLE, FK)
    *   `currency_id` (UUID, NOT NULL, FK)
    *   `base_amount` (DECIMAL(18, 2), NOT NULL)
    *   `recurrence_rule` (TEXT, NOT NULL) (ex: formato iCalendar RRULE)
    *   `start_date` (TIMESTAMPTZ, NOT NULL)
    *   `end_date` (TIMESTAMPTZ, NULLABLE)
    *   `next_due_date` (TIMESTAMPTZ, NULLABLE)
    *   `status` (TEXT, NOT NULL, DEFAULT 'active', CHECK (`status` IN ('active', 'paused', 'finished')))
    *   `auto_create_transaction` (BOOLEAN, DEFAULT FALSE)
    *   `days_before_due_to_create` (INT, DEFAULT 0)
    *   `cost_center` (TEXT, NULLABLE)
    *   `project` (TEXT, NULLABLE)
    *   `notes` (TEXT, NULLABLE)
    *   `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
    *   `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)

## 4. Migrações e Evolução do Schema

*   As definições SQL para criar estas tabelas e suas restrições estão localizadas na pasta `supabase/migrations/`.
*   A migração inicial do módulo financeiro (`V1__financial_module_setup.sql`) estabeleceu a base para as tabelas `companies`, `currencies`, `financial_accounts`, `transaction_categories`, `transactions`, e `recurring_transactions`.
*   Migrações subsequentes (ex: `V2__rename_financial_accounts_type_column.sql`, `V3__add_bank_name_to_financial_accounts.sql`, `V4__add_description_to_financial_accounts.sql` - *verificar números exatos usados*) foram aplicadas para refinar a tabela `financial_accounts`, renomeando `type` para `account_type` e adicionando as colunas `bank_name` e `description`.
*   Qualquer alteração na estrutura do banco de dados deve ser refletida através de novos arquivos de migração para garantir consistência entre ambientes e facilitar o versionamento do schema.
*   É importante popular a tabela `screens` com os registros correspondentes às telas do sistema para que as permissões possam ser atribuídas corretamente. A tabela `currencies` também foi populada inicialmente.

## 5. Políticas de Segurança em Nível de Linha (RLS)

Conforme mencionado no `ANALYSIS.md`, a implementação de RLS é crucial para a segurança, especialmente se houver planos para o frontend acessar dados diretamente (fora das Server Actions que usam o `service_role_client`).

*   **`profiles`**: Um usuário só deve poder ler/atualizar seu próprio perfil (a menos que seja um admin acessando via `service_role`).
*   **`roles`, `screens`, `role_screen_permissions`**: Estas tabelas podem ser mais restritivas. Usuários normais provavelmente não deveriam ter acesso direto de escrita a elas. A leitura pode ser permitida para `roles` e `screens` (para exibir informações na UI), mas a modificação deve ser controlada via Server Actions com lógica de permissão.
*   **Tabelas Financeiras (`companies`, `financial_accounts`, etc.)**: A lógica de RLS para estas tabelas deve garantir que um usuário só possa ver/modificar dados pertencentes à sua `company_id`. Operações que cruzam empresas ou que exigem uma visão global devem ser estritamente controladas por Server Actions utilizando o `service_role_client`.

## 6. Observações sobre o Cache de Schema do Supabase

Durante o desenvolvimento do módulo financeiro, foram encontrados desafios relacionados ao cache de schema do Supabase (PostgREST). Após aplicar alterações de DDL (Data Definition Language, como `ALTER TABLE`), o erro "Could not find column ... in the schema cache" persistiu mesmo após a execução do comando `NOTIFY pgrst, 'reload schema';`.

A solução definitiva envolveu:
1.  Garantir que a estrutura da tabela no banco de dados estivesse correta e alinhada com o código da aplicação.
2.  Executar `NOTIFY pgrst, 'reload schema';` no editor SQL do Supabase.
3.  **Crucialmente:** Utilizar a funcionalidade "Recarregar Schema" (ou similar) na seção "API" das configurações do projeto no Supabase Studio.
4.  Reiniciar o servidor de desenvolvimento Next.js.

Recomenda-se seguir todos esses passos após modificações no schema do banco para evitar problemas de cache.

Este documento deve ser mantido atualizado com quaisquer mudanças na estrutura do banco de dados. 