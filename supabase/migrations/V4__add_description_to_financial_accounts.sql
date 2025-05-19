-- Adiciona a coluna 'description' à tabela 'financial_accounts'
ALTER TABLE public.financial_accounts
ADD COLUMN description TEXT;

COMMENT ON COLUMN public.financial_accounts.description IS 'Optional description or notes for the financial account.'; 