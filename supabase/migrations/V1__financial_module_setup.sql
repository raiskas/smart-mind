-- Migration V1: Financial Module Setup
-- Order of operations:
-- 1. Create tables and add columns, deferring Foreign Key (FK) constraints where necessary.
-- 2. Add all FK constraints once tables and columns are in place.
-- 3. Seed initial data.

--------------------------------------------------------------------------------
-- Section 1: Create Tables & Add Columns (Deferring FK Constraints)
--------------------------------------------------------------------------------

-- 1.1. Create public.companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    official_name TEXT, -- Razão Social
    tax_id TEXT, -- CNPJ, EIN, etc.
    default_currency_id UUID, -- FK to public.currencies, will be added in Section 2
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
COMMENT ON TABLE public.companies IS 'Stores information about companies using the system.';
COMMENT ON COLUMN public.companies.default_currency_id IS 'Default currency for this company. FK to public.currencies table (to be added in Section 2).';

-- Trigger for companies.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_companies
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 1.2. Add company_id to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_id UUID; -- Add IF NOT EXISTS for safety

COMMENT ON COLUMN public.profiles.company_id IS 'The company this user profile belongs to. Null if not associated (e.g., super admin). FK to public.companies (to be added in Section 2).';

-- 1.3. Create public.currencies table
CREATE TABLE public.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO 4217 currency code (e.g., USD, BRL, ARS)
    name TEXT NOT NULL, -- (e.g., US Dollar, Brazilian Real)
    symbol VARCHAR(5), -- (e.g., $, R$)
    decimal_places INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.currencies IS 'Stores supported currencies and their details.';
COMMENT ON COLUMN public.currencies.code IS 'ISO 4217 currency code (e.g., USD, BRL, ARS).';

-- Trigger for currencies.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_currencies
BEFORE UPDATE ON public.currencies
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 1.4. Create public.financial_accounts table
CREATE TABLE public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- FK to public.companies, will be added in Section 2
    name TEXT NOT NULL, -- e.g., "Bank XYZ Checking", "Main Cash Drawer"
    type TEXT, -- e.g., "checking", "savings", "cash", "credit_card", "investment"
    account_number TEXT, -- Optional, masked or partial for security if displayed
    initial_balance DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    currency_id UUID NOT NULL, -- FK to public.currencies, will be added in Section 2
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.financial_accounts IS 'Stores financial accounts for each company (e.g., bank accounts, cash).';
CREATE INDEX IF NOT EXISTS idx_financial_accounts_company_id ON public.financial_accounts(company_id);

-- Trigger for financial_accounts.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_financial_accounts
BEFORE UPDATE ON public.financial_accounts
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 1.5. Create public.transaction_categories table
CREATE TABLE public.transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- FK to public.companies, will be added in Section 2
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')), -- 'income' for revenue, 'expense' for costs
    parent_category_id UUID, -- Self-referencing FK to public.transaction_categories, will be added in Section 2
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transaction_categories IS 'Stores transaction categories for each company (e.g., Sales, Office Supplies).';
COMMENT ON COLUMN public.transaction_categories.type IS 'Type of category: income or expense.';
COMMENT ON COLUMN public.transaction_categories.parent_category_id IS 'Allows for hierarchical categories. FK to be added in Section 2.';
CREATE INDEX IF NOT EXISTS idx_transaction_categories_company_id ON public.transaction_categories(company_id);
-- Unique constraint for category name within a company and type
ALTER TABLE public.transaction_categories ADD CONSTRAINT uq_company_category_name_type UNIQUE (company_id, name, type);


-- Trigger for transaction_categories.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_transaction_categories
BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 1.6. Create public.transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- FK to public.companies, will be added in Section 2
    financial_account_id UUID NOT NULL, -- FK to public.financial_accounts, will be added in Section 2
    category_id UUID, -- FK to public.transaction_categories, will be added in Section 2
    currency_id UUID NOT NULL, -- FK to public.currencies, will be added in Section 2
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    description TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    payment_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'received', 'overdue', 'cancelled', 'scheduled')),
    payment_method TEXT,
    document_number TEXT,
    notes TEXT,
    cost_center TEXT,
    project TEXT,
    created_by_user_id UUID, -- FK to public.profiles, will be added in Section 2
    related_transaction_id UUID, -- Self-referencing FK to public.transactions, will be added in Section 2
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transactions IS 'Stores all financial transactions for companies.';
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_financial_account_id ON public.transactions(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Trigger for transactions.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_transactions
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- 1.7. Create public.recurring_transactions table
CREATE TABLE public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- FK to public.companies, will be added in Section 2
    description TEXT NOT NULL,
    base_transaction_type TEXT NOT NULL CHECK (base_transaction_type IN ('income', 'expense')),
    financial_account_id UUID NOT NULL, -- FK to public.financial_accounts, will be added in Section 2
    category_id UUID, -- FK to public.transaction_categories, will be added in Section 2
    currency_id UUID NOT NULL, -- FK to public.currencies, will be added in Section 2
    base_amount DECIMAL(18, 2) NOT NULL,
    recurrence_rule TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    next_due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
    auto_create_transaction BOOLEAN DEFAULT FALSE,
    days_before_due_to_create INT DEFAULT 0,
    cost_center TEXT,
    project TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.recurring_transactions IS 'Defines templates for transactions that recur periodically.';
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_company_id ON public.recurring_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_due_date ON public.recurring_transactions(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_status ON public.recurring_transactions(status);

-- Trigger for recurring_transactions.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_recurring_transactions
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

--------------------------------------------------------------------------------
-- Section 2: Add Foreign Key Constraints
--------------------------------------------------------------------------------

-- 2.1. FK for public.companies.default_currency_id
ALTER TABLE public.companies
ADD CONSTRAINT fk_companies_default_currency FOREIGN KEY (default_currency_id) REFERENCES public.currencies(id) ON DELETE SET NULL;

-- 2.2. FK for public.profiles.company_id
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- 2.3. FKs for public.financial_accounts
ALTER TABLE public.financial_accounts
ADD CONSTRAINT fk_financial_accounts_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_financial_accounts_currency FOREIGN KEY (currency_id) REFERENCES public.currencies(id) ON DELETE RESTRICT;

-- 2.4. FKs for public.transaction_categories
ALTER TABLE public.transaction_categories
ADD CONSTRAINT fk_transaction_categories_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_transaction_categories_parent FOREIGN KEY (parent_category_id) REFERENCES public.transaction_categories(id) ON DELETE SET NULL;

-- 2.5. FKs for public.transactions
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_transactions_financial_account FOREIGN KEY (financial_account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_transactions_currency FOREIGN KEY (currency_id) REFERENCES public.currencies(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_transactions_created_by FOREIGN KEY (created_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_transactions_related_transaction FOREIGN KEY (related_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 2.6. FKs for public.recurring_transactions
ALTER TABLE public.recurring_transactions
ADD CONSTRAINT fk_recurring_transactions_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_recurring_transactions_financial_account FOREIGN KEY (financial_account_id) REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_recurring_transactions_category FOREIGN KEY (category_id) REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_recurring_transactions_currency FOREIGN KEY (currency_id) REFERENCES public.currencies(id) ON DELETE RESTRICT;

--------------------------------------------------------------------------------
-- Section 3: Seed Initial Data
--------------------------------------------------------------------------------

-- 3.1. Seed initial currencies
INSERT INTO public.currencies (code, name, symbol, decimal_places, created_at, updated_at)
VALUES
    ('USD', 'US Dollar', '$', 2, NOW(), NOW()),
    ('BRL', 'Brazilian Real', 'R$', 2, NOW(), NOW()),
    ('ARS', 'Argentine Peso', '$', 2, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 3.2. Insert new screens into public.screens
-- Ensure IDs are unique. Paths should align with Next.js routing.
INSERT INTO public.screens (id, name, path, module, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'Company Management', '/admin/management/companies', 'Admin', NOW(), NOW()),
    (gen_random_uuid(), 'Currencies Management', '/admin/management/currencies', 'Admin', NOW(), NOW()),
    (gen_random_uuid(), 'My Company Profile', '/company/profile', 'Company', NOW(), NOW()),
    (gen_random_uuid(), 'Financial Accounts Management', '/company/financials/accounts', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Transaction Categories Management', '/company/financials/categories', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Transactions - All', '/company/financials/transactions', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Transactions - Income', '/company/financials/transactions/income', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Transactions - Expenses', '/company/financials/transactions/expenses', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Transactions - Transfers', '/company/financials/transactions/transfers', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Accounts Payable', '/company/financials/payables', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Accounts Receivable', '/company/financials/receivables', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Recurring Transactions Management', '/company/financials/recurring', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Financial Reports - Cash Flow', '/company/financials/reports/cash-flow', 'Financial', NOW(), NOW()),
    (gen_random_uuid(), 'Financial Reports - Expenses by Category', '/company/financials/reports/expenses-by-category', 'Financial', NOW(), NOW())
ON CONFLICT (path) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    updated_at = NOW();

-- Note: After running this migration, you might want to manually (or via a subsequent script)
-- associate existing companies with a default_currency_id. For example:
-- WITH usd_currency AS (SELECT id FROM public.currencies WHERE code = 'USD')
-- UPDATE public.companies SET default_currency_id = (SELECT id FROM usd_currency) WHERE default_currency_id IS NULL; 