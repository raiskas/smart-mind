-- Migration V6: Setup Contacts Table and Enhance Transaction Tables
-- Ensures financial transactions can be linked to contacts (customers/suppliers)
-- and prepares for future features like attachments.

--------------------------------------------------------------------------------
-- Section 1: Define New ENUM Types
--------------------------------------------------------------------------------

-- 1.1. Create contact_type_enum for public.contacts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_type_enum') THEN
        CREATE TYPE public.contact_type_enum AS ENUM (
            'customer',
            'supplier',
            'other'
        );
        COMMENT ON TYPE public.contact_type_enum IS 'Type of contact (e.g., customer, supplier, other).';
    END IF;
END$$;

--------------------------------------------------------------------------------
-- Section 2: Create New Tables
--------------------------------------------------------------------------------

-- 2.1. Create public.contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    type public.contact_type_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contacts_company_name_type UNIQUE (company_id, name, type)
);

COMMENT ON TABLE public.contacts IS 'Stores information about contacts (customers, suppliers, etc.) for each company.';
COMMENT ON COLUMN public.contacts.company_id IS 'The company this contact belongs to.';
COMMENT ON COLUMN public.contacts.name IS 'Name of the contact.';
COMMENT ON COLUMN public.contacts.email IS 'Email address of the contact.';
COMMENT ON COLUMN public.contacts.phone IS 'Phone number of the contact.';
COMMENT ON COLUMN public.contacts.type IS 'Type of the contact (customer, supplier, or other).';

-- Trigger for contacts.updated_at
CREATE OR REPLACE TRIGGER handle_updated_at_contacts
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

--------------------------------------------------------------------------------
-- Section 3: Enhance Existing Tables
--------------------------------------------------------------------------------

-- 3.1. Enhance public.transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS contact_id UUID NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS attachment_url TEXT NULL,
ADD COLUMN IF NOT EXISTS recurring_instance_id UUID NULL REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.contact_id IS 'Reference to the contact (customer/supplier) associated with this transaction.';
COMMENT ON COLUMN public.transactions.attachment_url IS 'URL or path to an attached document (e.g., invoice, receipt).';
COMMENT ON COLUMN public.transactions.recurring_instance_id IS 'If this transaction was generated from a recurring transaction, this links to the parent recurring_transaction record.';

-- Ensure transaction_status CHECK constraint includes all necessary values
-- The V1 migration already defined: CHECK (status IN ('pending', 'paid', 'received', 'overdue', 'cancelled', 'scheduled'))
-- This list seems comprehensive for now.

-- 3.2. Enhance public.recurring_transactions table
ALTER TABLE public.recurring_transactions
ADD COLUMN IF NOT EXISTS contact_id UUID NULL REFERENCES public.contacts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.recurring_transactions.contact_id IS 'Reference to the contact (customer/supplier) associated with this recurring transaction.';

-- Ensure recurring_transaction_status CHECK constraint includes all necessary values
-- The V1 migration already defined: CHECK (status IN ('active', 'paused', 'finished'))
-- We might want to add 'cancelled' or other statuses later. For now, this is aligned with V1.
-- If we were to add 'cancelled':
-- ALTER TABLE public.recurring_transactions DROP CONSTRAINT recurring_transactions_status_check;
-- ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_status_check CHECK (status IN ('active', 'paused', 'finished', 'cancelled'));

--------------------------------------------------------------------------------
-- Section 4: Add Indexes for New Foreign Keys (Optional but Recommended)
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_contact_id ON public.transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_instance_id ON public.transactions(recurring_instance_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_contact_id ON public.recurring_transactions(contact_id);

--------------------------------------------------------------------------------
-- End of Migration V6
-------------------------------------------------------------------------------- 