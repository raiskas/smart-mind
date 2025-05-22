'use client';

import type { ContactListItem } from '@/lib/schemas/contact';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface ContactsTableProps {
  contacts: ContactListItem[];
  isLoading: boolean;
  onEdit: (contact: ContactListItem) => void;
  onDelete: (contactId: string) => void;
  // onNavigateToDetails?: (contactId: string) => void; // Opcional, para navegar para uma página de detalhes
}

export function ContactsTable({
  contacts,
  isLoading,
  onEdit,
  onDelete,
  // onNavigateToDetails,
}: ContactsTableProps) {
  const t = useTranslations('contacts_page.table'); // Namespace para traduções da tabela
  const tGlobal = useTranslations('global');

  if (isLoading && contacts.length === 0) {
    return <p>{tGlobal('loading')}...</p>;
  }

  if (!isLoading && contacts.length === 0) {
    return <p>{t('no_contacts_found')}</p>;
  }

  const getContactStatusBadgeVariant = (isActive: boolean): "default" | "outline" => {
    return isActive ? 'default' : 'outline';
  };

  const getContactStatusBadgeClassName = (isActive: boolean): string => {
    if (isActive) {
      return 'border-transparent bg-green-500 text-green-50 hover:bg-green-500/80 dark:bg-green-700 dark:text-green-50 dark:hover:bg-green-700/80';
    }
    return 'border-transparent bg-gray-500 text-gray-50 hover:bg-gray-500/80 dark:bg-gray-600 dark:text-gray-50 dark:hover:bg-gray-600/80';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('header_name')}</TableHead>
            <TableHead>{t('header_type')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('header_email')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('header_phone')}</TableHead>
            <TableHead className="text-center">{t('header_status')}</TableHead>
            <TableHead className="text-right">{t('header_actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && contacts.length > 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                {tGlobal('loading')}...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && contacts.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell>
                <div className="font-medium">{contact.name}</div>
                {contact.alias_name && (
                  <div className="text-xs text-muted-foreground">
                    {contact.alias_name}
                  </div>
                )}
              </TableCell>
              <TableCell>{contact.type ? tGlobal(`contact_type_${contact.type}`) : '-'}</TableCell>
              <TableCell className="hidden md:table-cell">{contact.email || '-'}</TableCell>
              <TableCell className="hidden sm:table-cell">{contact.phone_number || '-'}</TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant={getContactStatusBadgeVariant(contact.is_active)}
                  className={getContactStatusBadgeClassName(contact.is_active)}
                >
                  {contact.is_active ? tGlobal('status_active') : tGlobal('status_inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">{tGlobal('actions_menu')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* {onNavigateToDetails && (
                      <DropdownMenuItem onClick={() => onNavigateToDetails(contact.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {tGlobal('action_view_details')}
                      </DropdownMenuItem>
                    )} */}
                    <DropdownMenuItem onClick={() => onEdit(contact)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      {tGlobal('action_edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(contact.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-900/50">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tGlobal('action_delete')}
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