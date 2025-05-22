'use client';

import { useTransition } from 'react';
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
import { deleteRoleAction } from '@/app/actions/roleActions';
import { Badge } from '@/components/ui/badge';
import { type Role } from '@/lib/types/screens';

interface RoleTableProps {
  roles: Role[];
  onEditRole: (role: Role) => void;
}

export default function RoleTable({ roles, onEditRole }: RoleTableProps) {
  const router = useRouter();
  const t = useTranslations('RoleManagementPage');
  const [isPendingDelete, startTransitionDelete] = useTransition();

  const handleDeleteRole = async (roleIdToDelete: string) => {
    if (!roleIdToDelete) return;

    startTransitionDelete(async () => {
      const result = await deleteRoleAction(roleIdToDelete);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success && result.message) {
        toast.success(result.message);
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tableHeaderName')}</TableHead>
            <TableHead>{t('tableHeaderType')}</TableHead>
            <TableHead>{t('tableHeaderPermissions')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>{role.name}</TableCell>
              <TableCell>
                {role.isMaster ? (
                  <Badge variant="default">{t('masterRoleBadge')}</Badge>
                ) : (
                  <Badge variant="secondary">{t('standardRoleBadge')}</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {role.screenPermissions.map((permission) => (
                    <Badge key={permission.screenId} variant="outline">
                      {permission.canView ? '👁️' : ''}
                      {permission.canEdit ? '✏️' : ''}
                      {permission.canDelete ? '🗑️' : ''}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={role.name.toLowerCase() === 'admin'}
                  onClick={() => onEditRole(role)}
                >
                  {t('editButtonText')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={role.name.toLowerCase() === 'admin'}
                    >
                      {t('deleteButtonText')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteConfirmDescriptionRole', { roleName: role.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isPendingDelete}>
                        {t('cancelButtonText')}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteRole(role.id)} disabled={isPendingDelete}>
                        {isPendingDelete ? t('deletingButtonText') : t('confirmDeleteButtonText')}
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
  );
} 