'use client';

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CompanyData, CurrencyData } from './page'; // Types from the parent page
import { CreateCompanyFormState } from '../../../../actions/companyActions';
import { z } from 'zod';

// Assuming Shadcn/UI components are available
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Label } from '../../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { AlertDialog, AlertDialogDescription, AlertDialogTitle } from '../../../../../components/ui/alert-dialog';
import { Terminal } from 'lucide-react';

interface CompanyFormProps {
  formAction: (prevState: CreateCompanyFormState, formData: FormData) => Promise<CreateCompanyFormState>;
  initialFormState: CreateCompanyFormState;
  initialData?: CompanyData | null;
  currencies: CurrencyData[];
  onFormSubmitSuccess?: () => void; // Callback for successful submission (e.g., to close modal)
  onCancel: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const tShared = useTranslations('Shared');
  return (
    <Button type="submit" disabled={pending}>
      {pending ? tShared('buttons.saving') : tShared('buttons.saveChanges')}
    </Button>
  );
}

export default function CompanyForm({
  formAction,
  initialFormState,
  initialData,
  currencies,
  onFormSubmitSuccess,
  onCancel,
}: CompanyFormProps) {
  const t = useTranslations('Admin.CompanyManagement.form');
  const tShared = useTranslations('Shared');
  const [state, dispatch] = useFormState(formAction, initialFormState);

  useEffect(() => {
    if (state.message.includes('success')) {
      if (onFormSubmitSuccess) {
        onFormSubmitSuccess();
      }
    }
  }, [state, onFormSubmitSuccess]);

  // Helper to get error message for a specific field
  const getFieldError = (fieldName: string) => {
    return state.errors?.find((err: z.ZodIssue) => err.path.includes(fieldName))?.message;
  };

  return (
    <form action={dispatch}>
      {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}

      {state.message && !state.message.includes('success') && (
        <div className="mb-4 p-4 border border-red-500 rounded-md bg-red-50 text-red-700">
          <div className="flex">
            <Terminal className="h-4 w-4 mr-2 flex-shrink-0" />
            <h3 className="font-semibold">{tShared('form.errorTitle')}</h3>
          </div>
          <p className="text-sm">{state.message}</p>
        </div>
      )}

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            {t('name.label')}
          </Label>
          <Input id="name" name="name" defaultValue={initialData?.name || ''} className="col-span-3" />
          {getFieldError('name') && <p className="col-span-4 text-sm text-red-500 text-right pr-1">{getFieldError('name')}</p>}
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="officialName" className="text-right">
            {t('officialName.label')}
          </Label>
          <Input id="officialName" name="officialName" defaultValue={initialData?.official_name || ''} className="col-span-3" />
          {getFieldError('officialName') && <p className="col-span-4 text-sm text-red-500 text-right pr-1">{getFieldError('officialName')}</p>}
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="taxId" className="text-right">
            {t('taxId.label')}
          </Label>
          <Input id="taxId" name="taxId" defaultValue={initialData?.tax_id || ''} className="col-span-3" />
          {getFieldError('taxId') && <p className="col-span-4 text-sm text-red-500 text-right pr-1">{getFieldError('taxId')}</p>}
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="defaultCurrencyId" className="text-right">
            {t('defaultCurrency.label')}
          </Label>
          <Select name="defaultCurrencyId" defaultValue={initialData?.default_currency_id || ''}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('defaultCurrency.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.name} ({currency.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getFieldError('defaultCurrencyId') && <p className="col-span-4 text-sm text-red-500 text-right pr-1">{getFieldError('defaultCurrencyId')}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tShared('buttons.cancel')}
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
} 