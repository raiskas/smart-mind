'use client';

import { useMemo, useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter, Link } from '@/navigation';
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
import { deleteUserAction } from '@/app/actions/userActions';

// Definindo o tipo para um usuário individual, baseado no que buscamos
export interface UserData {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  roles: { id: string; name: string } | null;
  company_id?: string | null;
  company_name?: string | null;
}

interface UserTableProps {
  users: UserData[];
  onEditUser: (user: UserData) => void;
}

export default function UserTable({ users, onEditUser }: UserTableProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isPendingDelete, startTransitionDelete] = useTransition();

  const memoizedUsers = useMemo(() => users, [users]);

  const handleDeleteUser = async (userIdToDelete: string) => {
    if (!userIdToDelete) return;

    startTransitionDelete(async () => {
      const result = await deleteUserAction(userIdToDelete);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success && result.message) {
        toast.success(result.message);
        router.refresh(); 
      }
    });
  };

  if (!memoizedUsers || memoizedUsers.length === 0) {
    return <p>{t('UserManagementPage.noUsersFound')}</p>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* TODO: Adicionar traduções para os cabeçalhos da tabela */}
              <TableHead>{t('UserManagementPage.tableHeaderId')}</TableHead>
              <TableHead>{t('UserManagementPage.tableHeaderUsername')}</TableHead>
              <TableHead>{t('UserManagementPage.tableHeaderFullName')}</TableHead>
              <TableHead>{t('UserManagementPage.tableHeaderEmail')}</TableHead>
              <TableHead>{t('UserManagementPage.tableHeaderRole')}</TableHead>
              <TableHead>{t('UserManagementPage.tableHeaderCompany')}</TableHead>
              <TableHead>{t('UserManagementPage.tableHeaderActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memoizedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell>{user.username || t('Common.notSet')}</TableCell>
                <TableCell>{user.full_name || t('Common.notSet')}</TableCell>
                <TableCell>{user.email || t('Common.notSet')}</TableCell>
                <TableCell>{user.roles?.name || t('Common.notSet')}</TableCell>
                <TableCell>{user.company_name || t('Common.notSet')}</TableCell>
                <TableCell className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEditUser(user)}
                  >
                    {t('UserManagementPage.editButtonText')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                      >
                        {t('UserManagementPage.deleteButtonText')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('UserManagementPage.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('UserManagementPage.deleteConfirmDescription', { username: user.username || user.id })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPendingDelete}>
                          {t('UserManagementPage.cancelButtonText')}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)} disabled={isPendingDelete}>
                          {isPendingDelete ? t('UserManagementPage.deletingButtonText') : t('UserManagementPage.confirmDeleteButtonText')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
} 