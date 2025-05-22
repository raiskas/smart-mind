'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFormState } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner'; // Assumindo que sonner está instalado para toasts

import { Button } from '@/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { Input } from '@/components/ui/input';

import type {
  FinancialAccountWithCurrency,
  Currency,
  ActionFormState,
  FinancialAccountFormData,
  FinancialAccountTypeValue
} from './types';
import {
  createFinancialAccountAction,
  updateFinancialAccountAction,
  deleteFinancialAccountAction,
  getFinancialAccountsForCompany // Para recarregar a lista
} from '@/app/actions/financialAccountActions';

import FinancialAccountTable from './FinancialAccountTable';
import FinancialAccountForm from './FinancialAccountForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FINANCIAL_ACCOUNT_TYPES } from '@/lib/constants/financial';

interface FinancialAccountManagementPageClientProps {
  initialFinancialAccounts: FinancialAccountWithCurrency[];
  availableCurrencies: Currency[];
  companyId: string;
}

const initialState: ActionFormState = {
  isSuccess: false,
  isError: false,
  message: '',
  errors: {},
  data: null,
};

export default function FinancialAccountManagementPageClient({
  initialFinancialAccounts,
  availableCurrencies,
  companyId,
}: FinancialAccountManagementPageClientProps) {
  const t = useTranslations("admin.financials.management.financialAccounts");
  const tCommon = useTranslations("Common");
  const tGlobal = useTranslations("global");

  const [accounts, setAccounts] = useState<FinancialAccountWithCurrency[]>(initialFinancialAccounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccountFormData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const financialAccountTypesForForm = FINANCIAL_ACCOUNT_TYPES.map(typeConstant => ({
    value: typeConstant.value,
    label: tCommon(typeConstant.labelKey) || typeConstant.value,
  }));

  const [createFormState, createFormAction] = useFormState(createFinancialAccountAction, initialState);
  const [updateFormState, updateFormAction] = useFormState(updateFinancialAccountAction, initialState);
  const [deleteState, deleteDispatch] = useFormState(deleteFinancialAccountAction, initialState);

  const reloadAccounts = useCallback(async () => {
    console.log('[Client] reloadAccounts chamada.');
    const result = await getFinancialAccountsForCompany(); 
    console.log('[Client] reloadAccounts resultado de getFinancialAccountsForCompany:', result);
    if (result.isSuccess && result.data) {
      setAccounts(result.data);
      console.log('[Client] reloadAccounts - contas atualizadas no estado:', result.data);
    } else if (result.isError) {
      toast.error(result.message || tGlobal("errors.failedToLoadData", { item: t("messages.dataItemNamePlaceholder") || "dados" }));
    }
  }, [tGlobal, t]);

  useEffect(() => {
    if (deleteState.isSuccess) {
      toast.success(t("messages.deleteSuccess"));
      reloadAccounts();
    }
    if (deleteState.isError && deleteState.message) {
      toast.error(deleteState.message || t("errors.deleteFailed"));
    }
  }, [deleteState, reloadAccounts, t]);

  useEffect(() => {
    console.log('[Client] createFormState mudou:', createFormState);
    if (createFormState.isSuccess) {
      toast.success(t("messages.createSuccess"));
      handleCloseModal();
      console.log('[Client] createFormState sucesso, chamando reloadAccounts...');
      reloadAccounts();
    }
    if (createFormState.isError && createFormState.message) {
      toast.error(createFormState.message || t("errors.createFailed"));
    }
  }, [createFormState, reloadAccounts, t]);

  useEffect(() => {
    console.log('[Client] updateFormState mudou:', updateFormState);
    if (updateFormState.isSuccess) {
      toast.success(t("messages.updateSuccess"));
      handleCloseModal();
      console.log('[Client] updateFormState sucesso, chamando reloadAccounts...');
      reloadAccounts();
    }
    if (updateFormState.isError && updateFormState.message) {
      toast.error(updateFormState.message || t("errors.updateFailed"));
    }
  }, [updateFormState, reloadAccounts, t]);

  const handleOpenModal = (account?: FinancialAccountWithCurrency) => {
    if (account) {
      const formData: FinancialAccountFormData = {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        initial_balance: account.initial_balance,
        currency_id: account.currency_id,
        bank_name: account.bank_name,
        account_number: account.account_number,
        card_network: account.card_network,
        card_last_four_digits: account.card_last_four_digits,
        credit_limit: account.credit_limit,
        statement_closing_date: account.statement_closing_date,
        payment_due_date: account.payment_due_date,
        description: account.description,
        // Removendo temporariamente company_id e is_active para resolver erros de linter
        // ESTES PRECISAM SER ADICIONADOS AOS TIPOS EM ./types.ts
        // company_id: companyId, 
        // is_active: account.is_active === undefined ? true : account.is_active,
      };
      setAccountToEdit(formData);
    } else {
      setAccountToEdit(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAccountToEdit(null);
  };

  const handleDeleteAccount = (accountId: string) => {
    const formData = new FormData();
    formData.append('id', accountId);
    formData.append('companyId', companyId);
    deleteDispatch(formData);
  };

  const filteredAccounts = accounts.filter(account => {
    const term = searchTerm.toLowerCase();
    const typeLabel = FINANCIAL_ACCOUNT_TYPES.find(type => type.value === account.account_type);
    const translatedType = typeLabel ? tCommon(typeLabel.labelKey).toLowerCase() : '';

    return (
      account.name.toLowerCase().includes(term) ||
      (account.bank_name && account.bank_name.toLowerCase().includes(term)) ||
      translatedType.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Input 
          placeholder={tGlobal('search_placeholder')} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm" 
        />
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="mr-2 h-4 w-4" /> {t("createButton")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>
                {accountToEdit ? t("editModalTitle") : t("createModalTitle")}
              </DialogTitle>
            </DialogHeader>
            <FinancialAccountForm
              formAction={accountToEdit ? updateFormAction : createFormAction}
              initialState={accountToEdit ? updateFormState : createFormState}
              availableCurrencies={availableCurrencies}
              companyId={companyId}
              financialAccountToEdit={accountToEdit}
              closeModal={handleCloseModal}
              financialAccountTypes={financialAccountTypesForForm}
            />
          </DialogContent>
        </Dialog>
      </div>

      <FinancialAccountTable
        financialAccounts={filteredAccounts}
        onEdit={handleOpenModal} 
        handleDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
} 