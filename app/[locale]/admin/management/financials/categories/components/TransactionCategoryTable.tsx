'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { DotsHorizontalIcon, Pencil2Icon, TrashIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import type { TransactionCategory } from '@/lib/schemas/transactionCategory';

interface TransactionCategoryTableProps {
  categories: TransactionCategory[];
  onEdit: (category: TransactionCategory) => void;
  onDelete: (categoryId: string) => void;
  onToggleActive: (categoryId: string, currentState: boolean) => void;
  isPending: boolean; 
}

export default function TransactionCategoryTable({
  categories,
  onEdit,
  onDelete,
  onToggleActive,
  isPending,
}: TransactionCategoryTableProps) {
  const t = useTranslations('admin.financials.categories.table');
  const tCommon = useTranslations('Common');
  const tGlobalActions = useTranslations('global.actions');
  const tSharedButtons = useTranslations('Shared.buttons');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TransactionCategory | null>(null);

  const handleDeleteClick = (category: TransactionCategory) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      onDelete(categoryToDelete.id);
    }
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  if (categories.length === 0) {
    return null; 
  }

  return (
    <>
      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('headers.name')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('headers.type')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('headers.description')}</TableHead>
              <TableHead>{t('headers.status')}</TableHead>
              <TableHead className="text-right">{t('headers.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={category.type === 'income' ? 'default' : 'secondary'}
                         className={category.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'}>
                    {tCommon(`TransactionCategoryTypes.${category.type}`)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate">
                  {category.description || '-'}
                </TableCell>
                <TableCell>
                  {category.is_active ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
                      <CheckCircledIcon className="mr-1 h-3 w-3" />
                      {t('status.active')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <CrossCircledIcon className="mr-1 h-3 w-3" />
                      {t('status.inactive')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                        <span className="sr-only">{tGlobalActions('openMenu')}</span>
                        <DotsHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('headers.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(category)} disabled={isPending}>
                        <Pencil2Icon className="mr-2 h-4 w-4" />
                        {tGlobalActions('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleActive(category.id, category.is_active)} disabled={isPending}>
                        {category.is_active ? (
                           <><CrossCircledIcon className="mr-2 h-4 w-4" /> {t('actions.toggleInactive')}</>
                        ) : (
                           <><CheckCircledIcon className="mr-2 h-4 w-4" /> {t('actions.toggleActive')}</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteClick(category)} className="text-red-600 dark:text-red-500 hover:!text-red-700 dark:hover:!text-red-400" disabled={isPending}>
                        <TrashIcon className="mr-2 h-4 w-4" />
                        {tGlobalActions('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {categoryToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteDialog.description', { categoryName: categoryToDelete.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)} disabled={isPending}>
                {tSharedButtons('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400">
                {isPending ? tSharedButtons('deleting') : tGlobalActions('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
} 