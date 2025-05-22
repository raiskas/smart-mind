'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

import {
  CreateContactSchema, // Base para o formulário, já inclui is_active com default
  CreateContactFormData, // Usado para a action de criar
  UpdateContactFormData, // Usado para a action de atualizar
  CONTACT_TYPES,
  DOCUMENT_TYPES
} from '@/lib/schemas/contact';
import { createContactAction, updateContactAction } from '@/app/actions/contactActions';

// Schema de validação para o formulário. Extende CreateContactSchema (que tem os defaults)
// e adiciona um ID opcional para o caso de edição.
const ContactFormValidationSchema = CreateContactSchema.extend({
  id: z.string().uuid().optional(),
});

// Inferir o tipo base
type ContactFormValues = z.infer<typeof ContactFormValidationSchema>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ContactFormValues>; 
}

export function ContactFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ContactFormModalProps) {
  const t = useTranslations('contacts_page.form');
  const tGlobal = useTranslations('global');
  const isEditing = !!initialData?.id;

  const getInitialFormValues = (): ContactFormValues => {
    const defaultIsActive = true; // Default from schema for is_active
    const defaultAddressCountry = 'Brasil'; // Default from schema for address_country
    
    if (isEditing && initialData) {
      // Ensure all fields from ContactFormValues are present, falling back to defaults or null
      const allFields: ContactFormValues = {
        id: initialData.id, 
        name: initialData.name || '',
        alias_name: initialData.alias_name !== undefined ? initialData.alias_name : null,
        type: initialData.type || CONTACT_TYPES[0],
        document_type: initialData.document_type !== undefined ? initialData.document_type : null,
        document_number: initialData.document_number !== undefined ? initialData.document_number : null,
        email: initialData.email !== undefined ? initialData.email : null,
        phone_number: initialData.phone_number !== undefined ? initialData.phone_number : null,
        mobile_phone_number: initialData.mobile_phone_number !== undefined ? initialData.mobile_phone_number : null,
        address_street: initialData.address_street !== undefined ? initialData.address_street : null,
        address_number: initialData.address_number !== undefined ? initialData.address_number : null,
        address_complement: initialData.address_complement !== undefined ? initialData.address_complement : null,
        address_neighborhood: initialData.address_neighborhood !== undefined ? initialData.address_neighborhood : null,
        address_city: initialData.address_city !== undefined ? initialData.address_city : null,
        address_state: initialData.address_state !== undefined ? initialData.address_state : null,
        address_zip_code: initialData.address_zip_code !== undefined ? initialData.address_zip_code : null,
        address_country: initialData.address_country !== undefined ? initialData.address_country : defaultAddressCountry,
        notes: initialData.notes !== undefined ? initialData.notes : null,
        is_active: typeof initialData.is_active === 'boolean' ? initialData.is_active : defaultIsActive,
      };
      return allFields;
    }
    
    return {
      name: '', 
      type: CONTACT_TYPES[0], 
      is_active: defaultIsActive,
      address_country: defaultAddressCountry,
      id: undefined, 
      alias_name: null,
      document_type: null,
      document_number: null,
      email: '', 
      phone_number: null,
      mobile_phone_number: null,
      address_street: null,
      address_number: null,
      address_complement: null,
      address_neighborhood: null,
      address_city: null,
      address_state: null,
      address_zip_code: null,
      notes: null,
    } as ContactFormValues; 
  };

  const form = useForm<ContactFormValues>({
    // @ts-ignore TODO: Investigate persistent type mismatch with zodResolver
    resolver: zodResolver(ContactFormValidationSchema),
    defaultValues: getInitialFormValues(),
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = form;

  useEffect(() => {
    if (isOpen) {
      reset(getInitialFormValues());
    }
  }, [isOpen, initialData, reset]); // Removed baseDefaultValues, reset depends on initialData change

  const onSubmit: SubmitHandler<ContactFormValues> = async (values) => {
    let result;
    const actionType = isEditing ? 'update' : 'create';

    try {
      if (isEditing && values.id) {
        const updatePayload: UpdateContactFormData = {
          id: values.id,
          name: values.name,
          type: values.type,
          is_active: typeof values.is_active === 'boolean' ? values.is_active : true,
          alias_name: values.alias_name,
          document_type: values.document_type,
          document_number: values.document_number,
          email: values.email,
          phone_number: values.phone_number,
          mobile_phone_number: values.mobile_phone_number,
          address_street: values.address_street,
          address_number: values.address_number,
          address_complement: values.address_complement,
          address_neighborhood: values.address_neighborhood,
          address_city: values.address_city,
          address_state: values.address_state,
          address_zip_code: values.address_zip_code,
          address_country: values.address_country,
          notes: values.notes,
        };
        result = await updateContactAction(values.id, updatePayload);
      } else {
        const { id, ...createValuesWithoutId } = values;
        const createPayload: CreateContactFormData = {
            ...createValuesWithoutId,
            is_active: typeof values.is_active === 'boolean' ? values.is_active : true,
        };
        result = await createContactAction(createPayload);
      }

      if (result.isSuccess) {
        toast.success(tGlobal(actionType === 'create' ? 'messages.create_success' : 'messages.update_success', { item: tGlobal('contacts_page.singular_item_name') }));
        onSuccess();
      } else {
        toast.error(result.message || tGlobal('error_saving_data'));
        console.error(tGlobal('error_saving_data'), result.message, result.errors);
        if (result.errors) {
          result.errors.forEach(err => {
            const fieldName = err.path.join('.') as keyof ContactFormValues;
            form.setError(fieldName as any, { message: err.message });
          });
        }
      }
    } catch (error) {
      console.error("Unexpected error in onSubmit:", error);
      toast.error(tGlobal('error_unexpected'));
    }
  };
  
  // Renderização do formulário (igual à versão anterior, apenas garantindo que os componentes controlados estão corretos)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('title_edit') : t('title_create')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('description_edit') : t('description_create')}
          </DialogDescription>
        </DialogHeader>
        {/* @ts-ignore TODO: Investigate persistent type mismatch with handleSubmit */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t('field_name_label')} <span className="text-red-500">*</span></Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="alias_name">{t('field_alias_name_label')}</Label>
              <Input id="alias_name" {...register('alias_name')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="type">{t('field_type_label')} <span className="text-red-500">*</span></Label>
                <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder={t('field_type_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {CONTACT_TYPES.map(typeVal => (
                                    <SelectItem key={typeVal} value={typeVal}>{tGlobal(`contact_type_${typeVal}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <Label htmlFor="document_type">{t('field_document_type_label')}</Label>
              <Controller
                  control={control}
                  name="document_type"
                  render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value ?? ''}
                      >
                          <SelectTrigger id="document_type">
                              <SelectValue placeholder={t('field_document_type_placeholder')} />
                          </SelectTrigger>
                          <SelectContent>
                              {DOCUMENT_TYPES.map(docType => (
                                  <SelectItem key={docType} value={docType}>{docType}</SelectItem> 
                              ))}
                          </SelectContent>
                      </Select>
                  )}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="document_number">{t('field_document_number_label')}</Label>
            <Input id="document_number" {...register('document_number')} />
            {errors.document_number && <p className="text-xs text-red-500 mt-1">{errors.document_number.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('field_email_label')}</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone_number">{t('field_phone_number_label')}</Label>
              <Input id="phone_number" {...register('phone_number')} />
            </div>
          </div>
          
          <div>
            <Label htmlFor="mobile_phone_number">{t('field_mobile_phone_number_label')}</Label>
            <Input id="mobile_phone_number" {...register('mobile_phone_number')} />
          </div>

          <h3 className="text-lg font-medium pt-4 border-t mt-6">{t('address_section_title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address_street">{t('field_address_street_label')}</Label>
              <Input id="address_street" {...register('address_street')} />
            </div>
            <div>
              <Label htmlFor="address_number">{t('field_address_number_label')}</Label>
              <Input id="address_number" {...register('address_number')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address_complement">{t('field_address_complement_label')}</Label>
              <Input id="address_complement" {...register('address_complement')} />
            </div>
            <div>
              <Label htmlFor="address_neighborhood">{t('field_address_neighborhood_label')}</Label>
              <Input id="address_neighborhood" {...register('address_neighborhood')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="address_city">{t('field_address_city_label')}</Label>
              <Input id="address_city" {...register('address_city')} />
            </div>
            <div>
              <Label htmlFor="address_state">{t('field_address_state_label')}</Label>
              <Input id="address_state" {...register('address_state')} /> 
            </div>
            <div>
              <Label htmlFor="address_zip_code">{t('field_address_zip_code_label')}</Label>
              <Input id="address_zip_code" {...register('address_zip_code')} />
            </div>
          </div>
          <div>
            <Label htmlFor="address_country">{t('field_address_country_label')}</Label>
            <Input id="address_country" {...register('address_country')} />
          </div>

          <div>
            <Label htmlFor="notes">{t('field_notes_label')}</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t mt-6">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Checkbox 
                  id="is_active" 
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  // O valor do field já deve ser booleano devido ao default no Zod schema
                />
              )}
            />
            <Label htmlFor="is_active" className="font-medium">
              {t('field_is_active_label')}
            </Label>
          </div>
          
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>{tGlobal('action_cancel')}</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tGlobal('action_saving') : (isEditing ? tGlobal('action_save_changes') : tGlobal('action_create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 