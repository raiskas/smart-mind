'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DotsHorizontalIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import type { FinancialAccountWithCurrency } from './types';
import { FINANCIAL_ACCOUNT_TYPES } from '@/lib/constants/financial';

interface DeleteButtonProps {
  accountId: string;
  accountName: string;
  onConfirmDelete: (accountId: string) => void;
}

function DeleteConfirmationDialog({ accountId, accountName, onConfirmDelete }: DeleteButtonProps) {
  const tActions = useTranslations("global.actions");
  const tCommon = useTranslations("Common");

  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    onConfirmDelete(accountId);
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button 
          onClick={() => setIsOpen(true)} 
          className="flex items-center w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-sm"
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          {tActions("delete")}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tActions("confirmDeleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tActions("confirmDeleteMessageSpecific", { item: accountName, context: "conta financeira" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsOpen(false)}>{tActions("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            {tActions("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface FinancialAccountTableProps {
  financialAccounts: FinancialAccountWithCurrency[];
  onEdit: (account: FinancialAccountWithCurrency) => void;
  handleDeleteAccount: (accountId: string) => void;
}

export default function FinancialAccountTable({
  financialAccounts,
  onEdit,
  handleDeleteAccount,
}: FinancialAccountTableProps) {
  const t = useTranslations("admin.financials.management.financialAccounts.table");
  const tCommon = useTranslations("Common");
  const tGlobalActions = useTranslations("global.actions");
  const locale = useLocale();

  const getAccountTypeLabel = (typeValue: string) => {
    const typeConstant = FINANCIAL_ACCOUNT_TYPES.find(tc => tc.value === typeValue);
    if (typeConstant) {
      return tCommon(typeConstant.labelKey) || typeValue;
    }
    return typeValue;
  };

  if (!financialAccounts || financialAccounts.length === 0) {
    const tPage = useTranslations("admin.financials.management.financialAccounts");
    return <p>{tPage("noAccountsFound")}</p>;
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">{t("headers.name")}</TableHead>
              <TableHead className="min-w-[120px]">{t("headers.type")}</TableHead>
              <TableHead className="min-w-[150px] text-right">{t("headers.initialBalance")}</TableHead>
              <TableHead className="min-w-[100px]">{t("headers.currency")}</TableHead>
              <TableHead className="min-w-[150px]">{t("headers.bankName")}</TableHead>
              <TableHead className="min-w-[80px] text-right">{t("headers.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financialAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium max-w-xs truncate">{account.name}</TableCell>
                <TableCell>
                  <Badge variant={account.account_type === 'CREDIT_CARD' ? 'destructive' : 'outline'}>
                    {getAccountTypeLabel(account.account_type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat(locale, { style: 'currency', currency: account.currency_code || 'USD' }).format(account.initial_balance)}
                </TableCell>
                <TableCell>{account.currency_name} ({account.currency_code})</TableCell>
                <TableCell className="max-w-xs truncate">{account.bank_name || tCommon("notAvailable")}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{tGlobalActions("openMenu")}</span>
                        <DotsHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(account)} className="cursor-pointer">
                        <Pencil1Icon className="mr-2 h-4 w-4" />
                        {tGlobalActions("edit")}
                      </DropdownMenuItem>
                      <DeleteConfirmationDialog 
                        accountId={account.id} 
                        accountName={account.name}
                        onConfirmDelete={handleDeleteAccount} 
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 