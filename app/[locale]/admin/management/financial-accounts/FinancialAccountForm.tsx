'use client';

import React, { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // Para o campo de descrição
import type { FinancialAccountFormProps, FinancialAccountFormData, FinancialAccountTypeValue } from './types';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Salvando...' : label}
    </Button>
  );
}

export default function FinancialAccountForm({
  formAction,
  initialState,
  availableCurrencies,
  companyId,
  financialAccountToEdit,
  closeModal,
  financialAccountTypes,
}: FinancialAccountFormProps) {
  const t = useTranslations("admin.financials.management.financialAccounts.form");
  const tGlobal = useTranslations("global");

  // Estado local para controlar os campos, especialmente os condicionais
  const [selectedAccountType, setSelectedAccountType] = useState<FinancialAccountTypeValue | undefined>(
    financialAccountToEdit?.account_type
  );

  useEffect(() => {
    if (financialAccountToEdit?.account_type) {
      setSelectedAccountType(financialAccountToEdit.account_type);
    }
  }, [financialAccountToEdit]);

  const isCreditCard = selectedAccountType === 'CREDIT_CARD';

  return (
    <form action={formAction} className="space-y-6">
      {initialState?.isError && initialState?.message && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <p className="font-semibold">{tGlobal("errors.formErrorTitle")}</p>
          <p>{initialState.message}</p>
          {initialState.errors && typeof initialState.errors === 'object' && Object.entries(initialState.errors).map(([key, value]) => {
            if (typeof value === 'string') { // Se o erro for uma string simples associada ao campo
              return <p key={key} className="text-sm">- {value}</p>; 
            }
            if (Array.isArray(value)) { // Se for um array de strings (Zod errors)
              return value.map((err: string, index: number) => (
                <p key={`${key}-${index}`} className="text-sm">- {key}: {err}</p>
              ));
            }
            return null;
          })}
        </div>
      )}

      {financialAccountToEdit?.id && (
        <input type="hidden" name="id" value={financialAccountToEdit.id} />
      )}
      <input type="hidden" name="companyId" value={companyId} />

      <div>
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" defaultValue={financialAccountToEdit?.name || ''} required />
        {initialState?.errors?.name && (
          <p className="text-sm text-red-500">{initialState.errors.name.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="account_type">{t("typeLabel")}</Label>
        <Select name="account_type" defaultValue={financialAccountToEdit?.account_type} onValueChange={(value) => setSelectedAccountType(value as FinancialAccountTypeValue)} required>
          <SelectTrigger>
            <SelectValue placeholder={t("typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {financialAccountTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {initialState?.errors?.account_type && (
          <p className="text-sm text-red-500">{initialState.errors.account_type.join(', ')}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="initial_balance">{t("initialBalanceLabel")}</Label>
        <Input id="initial_balance" name="initial_balance" type="number" step="0.01" defaultValue={financialAccountToEdit?.initial_balance?.toString() || '0'} required />
        {initialState?.errors?.initial_balance && (
          <p className="text-sm text-red-500">{initialState.errors.initial_balance.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="currency_id">{t("currencyLabel")}</Label>
        <Select name="currency_id" defaultValue={financialAccountToEdit?.currency_id} required>
          <SelectTrigger>
            <SelectValue placeholder={t("currencyPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {availableCurrencies.map(currency => (
              <SelectItem key={currency.id} value={currency.id}>{currency.name} ({currency.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {initialState?.errors?.currency_id && (
          <p className="text-sm text-red-500">{initialState.errors.currency_id.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="bank_name">{t("bankNameLabel")}</Label>
        <Input id="bank_name" name="bank_name" defaultValue={financialAccountToEdit?.bank_name || ''} />
         {initialState?.errors?.bank_name && (
          <p className="text-sm text-red-500">{initialState.errors.bank_name.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="account_number">{t("accountNumberLabel")}</Label>
        <Input id="account_number" name="account_number" defaultValue={financialAccountToEdit?.account_number || ''} />
        {initialState?.errors?.account_number && (
          <p className="text-sm text-red-500">{initialState.errors.account_number.join(', ')}</p>
        )}
      </div>

      {isCreditCard && (
        <>
          <div>
            <Label htmlFor="card_network">{t("cardNetworkLabel")}</Label>
            <Input id="card_network" name="card_network" defaultValue={financialAccountToEdit?.card_network || ''} />
            {initialState?.errors?.card_network && <p className="text-sm text-red-500">{initialState.errors.card_network.join(', ')}</p>}
          </div>
          <div>
            <Label htmlFor="card_last_four_digits">{t("cardLastFourDigitsLabel")}</Label>
            <Input id="card_last_four_digits" name="card_last_four_digits" maxLength={4} defaultValue={financialAccountToEdit?.card_last_four_digits || ''} />
            {initialState?.errors?.card_last_four_digits && <p className="text-sm text-red-500">{initialState.errors.card_last_four_digits.join(', ')}</p>}
          </div>
          <div>
            <Label htmlFor="credit_limit">{t("creditLimitLabel")}</Label>
            <Input id="credit_limit" name="credit_limit" type="number" step="0.01" defaultValue={financialAccountToEdit?.credit_limit?.toString() || ''} />
            {initialState?.errors?.credit_limit && <p className="text-sm text-red-500">{initialState.errors.credit_limit.join(', ')}</p>}
          </div>
          <div>
            <Label htmlFor="statement_closing_date">{t("statementClosingDateLabel")}</Label>
            <Input id="statement_closing_date" name="statement_closing_date" type="number" min="1" max="31" defaultValue={financialAccountToEdit?.statement_closing_date?.toString() || ''} />
            {initialState?.errors?.statement_closing_date && <p className="text-sm text-red-500">{initialState.errors.statement_closing_date.join(', ')}</p>}
          </div>
          <div>
            <Label htmlFor="payment_due_date">{t("paymentDueDateLabel")}</Label>
            <Input id="payment_due_date" name="payment_due_date" type="number" min="1" max="31" defaultValue={financialAccountToEdit?.payment_due_date?.toString() || ''} />
            {initialState?.errors?.payment_due_date && <p className="text-sm text-red-500">{initialState.errors.payment_due_date.join(', ')}</p>}
          </div>
        </>
      )}

      <div>
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <Textarea id="description" name="description" defaultValue={financialAccountToEdit?.description || ''} />
        {initialState?.errors?.description && (
          <p className="text-sm text-red-500">{initialState.errors.description.join(', ')}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={closeModal}>{tGlobal("actions.cancel")}</Button>
        <SubmitButton label={financialAccountToEdit ? tGlobal("actions.saveChanges") : tGlobal("actions.create")} />
      </div>
    </form>
  );
} 