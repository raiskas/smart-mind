'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

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
import type { FinancialAccountTypeValue } from '@/lib/constants/financial';

interface FinancialAccountWithCurrency {
  id: string;
  name: string;
  account_type: FinancialAccountTypeValue;
  initial_balance: number;
  currency_id: string;
  currency_code: string;
  currency_name: string;
  bank_name?: string | null;
  account_number?: string | null;
  card_network?: string | null;
  card_last_four_digits?: string | null;
  credit_limit?: number | null;
  statement_closing_date?: number | null;
  payment_due_date?: number | null;
  description?: string | null;
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="max-w-xs truncate">{t("columns.name")}</TableHead>
          <TableHead className="hidden sm:table-cell">{t("columns.type")}</TableHead>
          <TableHead className="hidden md:table-cell">{t("columns.initialBalance")}</TableHead>
          <TableHead className="hidden lg:table-cell">{t("columns.currency")}</TableHead>
          <TableHead className="hidden sm:table-cell max-w-xs truncate">{t("columns.bankName")}</TableHead>
          <TableHead className="text-right">{tGlobal("tableHeaders.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {financialAccounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell className="font-medium max-w-xs truncate">{account.name}</TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="outline">{account.account_type}</Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: account.currency_code || 'USD' }).format(account.initial_balance)}
            </TableCell>
            <TableCell className="hidden lg:table-cell">{account.currency_name} ({account.currency_code})</TableCell>
            <TableCell className="hidden sm:table-cell max-w-xs truncate">{account.bank_name || '-'}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <MoreHorizontalIcon className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit(account)}>
                    <Pencil1Icon className="mr-2 h-4 w-4" />
                    <span>{t("actions.edit")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteAccount(account.id)}>
                    <TrashIcon className="mr-2 h-4 w-4" />
                    <span>{t("actions.delete")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 