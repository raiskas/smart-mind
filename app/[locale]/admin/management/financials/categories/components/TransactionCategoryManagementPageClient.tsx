'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

import type { TransactionCategory, CreateTransactionCategoryPayload, UpdateTransactionCategoryPayload } from '@/lib/schemas/transactionCategory';
import {
  createTransactionCategoryAction,
  updateTransactionCategoryAction,
  deleteTransactionCategoryAction,
  toggleTransactionCategoryActiveStateAction,
} from '@/app/actions/transactionCategoryActions';
import type { ActionResponse } from '@/lib/types/actions';
import TransactionCategoryTable from './TransactionCategoryTable'; 
import TransactionCategoryForm from './TransactionCategoryForm';   

interface TransactionCategoryManagementPageClientProps {
  initialCategories: TransactionCategory[];
  companyId: string; 
}

type CategoryModalData = Partial<TransactionCategory> & { id?: string };

export default function TransactionCategoryManagementPageClient({
  initialCategories,
  companyId,
}: TransactionCategoryManagementPageClientProps) {
  const t = useTranslations('admin.financials.categories');
  const tGlobal = useTranslations('global');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<TransactionCategory[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
  const [currentCategory, setCurrentCategory] = useState<CategoryModalData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const handleOpenCreateModal = () => {
    setCurrentCategory(null);
    setModalType('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: TransactionCategory) => {
    setCurrentCategory(category);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      setModalType(null);
      setCurrentCategory(null);
    }
    setIsModalOpen(open);
  };

  const handleFormSubmit = async (formData: CreateTransactionCategoryPayload | UpdateTransactionCategoryPayload) => {
    startTransition(async () => {
      let response: ActionResponse<TransactionCategory> | ActionResponse;
      if (modalType === 'create') {
        response = await createTransactionCategoryAction(formData as CreateTransactionCategoryPayload);
      } else if (modalType === 'edit' && currentCategory?.id) {
        response = await updateTransactionCategoryAction(currentCategory.id, formData as UpdateTransactionCategoryPayload);
      } else {
        toast.error(tGlobal('errors.invalidOperation'));
        return;
      }

      if (response.isSuccess) {
        toast.success(response.message || tGlobal('success.operationSuccessful'));
        setIsModalOpen(false);
        router.refresh(); 
      } else {
        toast.error(response.message || tGlobal('errors.operationFailed'), {
          description: response.errors?.map((e: import('zod').ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('\n')
        });
      }
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    startTransition(async () => {
      const response = await deleteTransactionCategoryAction(categoryId);
      if (response.isSuccess) {
        toast.success(response.message || t('messages.deleteSuccess'));
        router.refresh();
      } else {
        toast.error(response.message || t('errors.deleteFailed'));
      }
    });
  };  
  const handleToggleActiveState = (categoryId: string, currentState: boolean) => {
    startTransition(async () => {
      const response = await toggleTransactionCategoryActiveStateAction(categoryId, currentState);
      if (response.isSuccess) {
        toast.success(response.message || t('messages.statusUpdateSuccess'));
        router.refresh();
      } else {
        toast.error(response.message || t('errors.statusUpdateFailed'));
      }
    });
  };

  const filteredCategories = categories.filter(category => {
    const term = searchTerm.toLowerCase();
    return (
      category.name.toLowerCase().includes(term) ||
      (category.description && category.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Input 
          placeholder={tGlobal('search_placeholder')} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleOpenCreateModal} className="whitespace-nowrap" disabled={isPending}>
          <PlusCircledIcon className="mr-2 h-5 w-5" />
          {t('createButton')}
        </Button>
      </div>

      {(!isPending && filteredCategories.length > 0) && (
        <TransactionCategoryTable 
          categories={filteredCategories} 
          onEdit={handleOpenEditModal} 
          onDelete={handleDeleteCategory} 
          onToggleActive={handleToggleActiveState}
          isPending={isPending}
        />
      )}
      {isPending && (
        <p className="text-center text-gray-500 dark:text-gray-400">{tGlobal('messages.loading')}</p>
      )}
      {filteredCategories.length === 0 && !isPending && (
          <p className="text-center text-gray-500 dark:text-gray-400">{t('noCategoriesFound')}</p>
      )}

      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? t('createModalTitle') : t('editModalTitle')}
            </DialogTitle>
            {currentCategory?.name && modalType === 'edit' && (
              <DialogDescription>
                {t('editingCategory', { categoryName: currentCategory.name })}
              </DialogDescription>
            )}
          </DialogHeader>
          {(modalType === 'create' || (modalType === 'edit' && currentCategory !== null)) && (
            <TransactionCategoryForm
              companyId={companyId} 
              onSubmit={handleFormSubmit}
              initialData={currentCategory ?? {}} 
              isPending={isPending || (modalType === 'create' ? false : !currentCategory)} 
              formType={modalType!}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 