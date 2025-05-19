'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { deleteCompanyAction, ActionFormState as ServerActionFormState } from '@/app/actions/companyActions';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Import types from the new central file
import { Company, CompanyWithDetails, ActionFormState } from './types';

interface CompanyTableProps {
  companies: CompanyWithDetails[];
  onEdit: (company: Company) => void;
  onDeleteSuccess: () => void;
}

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('CompanyManagement.Table.Actions');

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-left relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      {pending ? t('deleting') : t('delete')}
    </button>
  );
}

function CompanyTableRowActions({
  company,
  onEdit,
  onDeleteSuccess,
}: {
  company: CompanyWithDetails;
  onEdit: (company: Company) => void;
  onDeleteSuccess: () => void;
}) {
  const t = useTranslations('CompanyManagement.Table.Actions');
  const initialState: ActionFormState = { message: '', companyId: company.id };
  const [deleteState, deleteAction] = useFormState(deleteCompanyAction, initialState as ServerActionFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (deleteState?.message && deleteState.message !== '') {
      if (deleteState.success) {
        toast.success(deleteState.message);
        onDeleteSuccess();
      } else if (deleteState.success === false) {
        toast.error(deleteState.message);
      }
    }
  }, [deleteState, onDeleteSuccess]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('openMenu')}</span>
          <DotsHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(company)}>
          {t('edit')}
        </DropdownMenuItem>
        <form action={deleteAction} ref={formRef} className="w-full">
          <input type="hidden" name="id" value={company.id} />
          <DeleteButton />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CompanyTable({
  companies,
  onEdit,
  onDeleteSuccess,
}: CompanyTableProps) {
  const t = useTranslations('CompanyManagement.Table');

  if (!companies || companies.length === 0) {
    return <div className="mt-6 text-center text-gray-500">{t('noCompanies')}</div>;
  }

  return (
    <div className="rounded-md border mt-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Headers.name')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Headers.officialName')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('Headers.taxId')}</TableHead>
            <TableHead>{t('Headers.defaultCurrency')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('Headers.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell className="hidden md:table-cell">{company.official_name || '-'}</TableCell>
              <TableCell className="hidden sm:table-cell">{company.tax_id || '-'}</TableCell>
              <TableCell>{company.currency_name || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <CompanyTableRowActions
                  company={company}
                  onEdit={onEdit}
                  onDeleteSuccess={onDeleteSuccess}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 