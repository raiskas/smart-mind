'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateTransactionCategoryPayload, UpdateTransactionCategoryPayload, TransactionCategory } from '@/lib/schemas/transactionCategory';
import { TRANSACTION_CATEGORY_TYPES_OPTIONS } from '@/lib/constants/financial';

interface TransactionCategoryFormProps {
  companyId: string; 
  formType: 'create' | 'edit';
  initialData?: Partial<TransactionCategory>;
  onSubmit: (payload: CreateTransactionCategoryPayload | UpdateTransactionCategoryPayload) => Promise<void>;
  isPending: boolean;
}

export default function TransactionCategoryForm({
  companyId,
  formType,
  initialData = {},
  onSubmit,
  isPending,
}: TransactionCategoryFormProps) {
  const t = useTranslations('admin.financials.categories.form');
  const tCommon = useTranslations('Common');
  const tShared = useTranslations('Shared');
  const { pending } = useFormStatus(); 

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      type: formData.get('type') as 'income' | 'expense',
      description: formData.get('description') as string | null,
    };
    onSubmit(payload as CreateTransactionCategoryPayload | UpdateTransactionCategoryPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <input type="hidden" name="companyId" value={companyId} />
      {formType === 'edit' && initialData?.id && (
        <input type="hidden" name="categoryId" value={initialData.id} />
      )}

      <div>
        <Label htmlFor="name">{t('nameLabel')}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialData?.name || ''}
          placeholder={t('namePlaceholder')}
          required
          disabled={isPending}
          maxLength={100}
        />
      </div>

      <div>
        <Label htmlFor="type">{t('typeLabel')}</Label>
        <Select name="type" defaultValue={initialData?.type} required disabled={isPending}>
          <SelectTrigger>
            <SelectValue placeholder={t('typePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_CATEGORY_TYPES_OPTIONS.map((option: typeof TRANSACTION_CATEGORY_TYPES_OPTIONS[number]) => (
              <SelectItem key={option.value} value={option.value}>
                {tCommon(`TransactionCategoryTypes.${option.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description || ''}
          placeholder={t('descriptionPlaceholder')}
          disabled={isPending}
          rows={3}
          maxLength={255}
        />
      </div>
      
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending || pending} className="w-full sm:w-auto">
          {isPending || pending
            ? tShared('buttons.saving')
            : formType === 'create'
            ? tShared('buttons.create')
            : tShared('buttons.saveChanges')}
        </Button>
      </div>
    </form>
  );
} 