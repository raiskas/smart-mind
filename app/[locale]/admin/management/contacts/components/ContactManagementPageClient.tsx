'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import type { ContactListItem, Contact } from '@/lib/schemas/contact';
import { DOCUMENT_TYPES } from '@/lib/schemas/contact';
import { ContactsTable } from './ContactsTable';
import { ContactFormModal } from './ContactFormModal';
import { createContactAction, updateContactAction, deleteContactAction, getContactsForCompanyAction, getContactByIdAction } from '@/app/actions/contactActions';

interface ContactManagementPageClientProps {
  initialContacts: ContactListItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchTerm?: string;
}

export function ContactManagementPageClient({
  initialContacts,
  totalCount,
  currentPage: initialCurrentPage,
  pageSize: initialPageSize,
  searchTerm: initialSearchTerm,
}: ContactManagementPageClientProps) {
  const t = useTranslations('contacts_page');
  const tGlobal = useTranslations('global');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(initialSearchTerm);
  const [localSearchTerm, setLocalSearchTerm] = useState(initialSearchTerm || '');

  const [contacts, setContacts] = useState<ContactListItem[]>(initialContacts);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<Contact | null>(null);
  const [isFetchingEditData, setIsFetchingEditData] = useState(false);

  const fetchContacts = useCallback(async (page: number, term?: string) => {
    setIsLoading(true);
    const result = await getContactsForCompanyAction({ 
        page, 
        pageSize: initialPageSize,
        searchTerm: term 
    });
    if (result.isSuccess && result.data) {
      setContacts(result.data.contacts);
      setCurrentTotalCount(result.data.totalCount);
      setCurrentPage(page);
      setCurrentSearchTerm(term);
    } else {
      console.error(tGlobal('error_fetching_data'), result.message);
    }
    setIsLoading(false);
  }, [initialPageSize, tGlobal]);

  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    const termFromUrl = searchParams.get('searchTerm');
    const newPage = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    setLocalSearchTerm(termFromUrl || '');
    fetchContacts(newPage, termFromUrl || undefined);
  }, [searchParams, fetchContacts]);

  const handleOpenModalForCreate = () => {
    setSelectedContactForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = async (contactToEdit: ContactListItem) => {
    setIsFetchingEditData(true);
    setSelectedContactForEdit(null);
    
    const result = await getContactByIdAction(contactToEdit.id);
    
    if (result.isSuccess && result.data) {
      setSelectedContactForEdit(result.data);
      setIsModalOpen(true);
    } else {
      console.error(tGlobal('error_fetching_data') + ": " + (result.message || 'Failed to fetch contact details for editing.'));
    }
    setIsFetchingEditData(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContactForEdit(null);
  };

  const handleContactSaveSuccess = () => {
    fetchContacts(currentPage, currentSearchTerm);
    handleCloseModal();
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm(tGlobal('confirm_delete_prompt'))) return;
    
    setIsLoading(true); 
    const result = await deleteContactAction(contactId);
    if (result.isSuccess) {
      const contactName = contacts.find(c => c.id === contactId)?.name || tGlobal('contacts_page.singular_item_name');
      toast.success(tGlobal('messages.delete_success', { item: contactName }));

      if (contacts.length === 1 && currentPage > 1 && currentTotalCount > 1) {
        const newPage = currentPage - 1;
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
      } else {
        fetchContacts(currentPage, currentSearchTerm);
      }
    } else {
      toast.error(result.message || t('error_deleting_contact'));
      console.error(t('error_deleting_contact'), result.message);
    }
    setIsLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleSearchSubmit = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (localSearchTerm.trim()) {
      params.set('searchTerm', localSearchTerm.trim());
    } else {
      params.delete('searchTerm');
    }
    params.set('page', '1'); 
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-grow sm:flex-grow-0 sm:max-w-xs md:max-w-sm lg:max-w-md w-full">
          <Input
            type="search"
            placeholder={tGlobal('search_placeholder', { default: "Buscar contatos..." })}
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            onKeyDown={handleSearchInputKeyDown}
            className="h-10 w-full"
          />
        </div>
        <Button onClick={handleOpenModalForCreate} className="h-10 whitespace-nowrap">
          <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" />
          {t('create_contact_button')}
        </Button>
      </div>

      <ContactsTable 
          contacts={contacts}
          isLoading={isLoading || isFetchingEditData}
          onEdit={handleOpenModalForEdit}
          onDelete={handleDeleteContact}
      />
      
      {isModalOpen && (
        <ContactFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleContactSaveSuccess}
          initialData={selectedContactForEdit ?? undefined}
        />
      )}

      <div className="mt-4 flex justify-center items-center">
        <Button 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading || isFetchingEditData}
          variant="outline"
          className="mr-2"
        >
          {tGlobal('previous_page')}
        </Button>
        <span>{tGlobal('page')} {currentPage} / {Math.ceil(currentTotalCount / initialPageSize)}</span>
        <Button 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={(currentPage * initialPageSize >= currentTotalCount) || isLoading || isFetchingEditData}
          variant="outline"
          className="ml-2"
        >
          {tGlobal('next_page')}
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        {tGlobal('total_items', { count: currentTotalCount })}
      </p>

    </div>
  );
} 