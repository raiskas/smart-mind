'use client';

import { useTranslations, useLocale } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Para exibir status e tipo
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TransactionTypeValue, TransactionStatusValue } from '@/app/lib/constants/financial'; // Importar tipos

// Estrutura de dados da Transação expandida
export interface Transaction {
  id: string;
  date: string; // Recomenda-se formato ISO string (ex: "2023-10-26T10:00:00.000Z")
  description: string;
  amount: number;
  currencyCode: string; // ex: 'BRL', 'USD'
  type: TransactionTypeValue;
  categoryName?: string;
  financialAccountName: string;
  contactName?: string;
  status: TransactionStatusValue;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

// Helper para formatar moeda
const formatCurrency = (amount: number, currencyCode: string, locale: string) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

export default function TransactionsTable({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const t = useTranslations('Financials.TransactionsPage.table');
  const tShared = useTranslations('Shared');
  const tStatus = useTranslations('TransactionStatus'); // Para traduzir status
  const tTypes = useTranslations('TransactionTypes'); // Para traduzir tipos
  const currentLocale = useLocale(); // Correção para obter o locale atual

  if (isLoading) {
    // TODO: Usar um Skeleton Loader mais elaborado do shadcn/ui
    return <p>{tShared('loading')}</p>; 
  }

  if (transactions.length === 0) {
    return <p>{t('noTransactionsFound')}</p>;
  }

  const getStatusBadgeVariant = (status: TransactionStatusValue): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'paid':
      case 'received': 
        return 'default'; 
      case 'pending':
      case 'scheduled':
        return 'secondary';
      case 'cancelled':
      case 'overdue':
        return 'destructive';
      default: return 'outline';
    }
  };
  
  const getStatusBadgeClassName = (status: TransactionStatusValue) => {
    if (status === 'paid' || status === 'received') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (status === 'overdue') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    // Adicionar outras classes conforme necessário
    return '';
  };

  const getTypeBadgeVariant = (type: TransactionTypeValue): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'income': return 'default'; 
      case 'expense': return 'outline'; 
      case 'transfer': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeBadgeClassName = (type: TransactionTypeValue) => {
    if (type === 'income') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (type === 'expense') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    return '';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('date')}</TableHead>
            <TableHead>{t('description')}</TableHead>
            <TableHead>{t('category')}</TableHead>
            <TableHead>{t('financialAccount')}</TableHead>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead className="text-right">{t('amount')}</TableHead>
            <TableHead className="text-center">{tShared('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {new Date(transaction.date).toLocaleDateString(currentLocale, {
                  year: 'numeric', month: 'short', day: 'numeric'
                })}
              </TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell>{transaction.categoryName || '-'}</TableCell>
              <TableCell>{transaction.financialAccountName}</TableCell>
              <TableCell>
                <Badge variant={getTypeBadgeVariant(transaction.type)} className={getTypeBadgeClassName(transaction.type)}>
                  {tTypes(transaction.type)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(transaction.status)} className={getStatusBadgeClassName(transaction.status)}>
                  {tStatus(transaction.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(transaction.amount, transaction.currencyCode, currentLocale)}
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">{tShared('openMenu')}</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Edit className="mr-2 h-4 w-4" />
                      {tShared('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tShared('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 