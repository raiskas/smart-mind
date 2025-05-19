'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

import type { TransactionCategory, CreateTransactionCategoryPayload, UpdateTransactionCategoryPayload } from '@/lib/schemas/transactionCategory';
import {
  createTransactionCategoryAction,
  updateTransactionCategoryAction,
  deleteTransactionCategoryAction,
  toggleTransactionCategoryActiveStateAction,
  type ActionResponse
} from '@/app/actions/transactionCategoryActions';
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
          description: response.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
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

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('description')}
            </p>
          </div>
          <Button onClick={handleOpenCreateModal} className="mt-4 sm:mt-0" disabled={isPending}>
            <PlusCircledIcon className="mr-2 h-5 w-5" />
            {t('createButton')}
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 min-h-[200px]">
          {(!isPending && categories.length > 0) && (
            <TransactionCategoryTable 
              categories={categories} 
              onEdit={handleOpenEditModal} 
              onDelete={handleDeleteCategory} 
              onToggleActive={handleToggleActiveState}
              isPending={isPending}
            />
          )}
          {isPending && (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-4">{tGlobal('messages.loading')}</p>
          )}
          {categories.length === 0 && !isPending && (
             <p className="text-center text-gray-500 dark:text-gray-400 mt-4">{t('noCategoriesFound')}</p>
          )}
        </div>
      </section>

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