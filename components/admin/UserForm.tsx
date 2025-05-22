'use client';

import { useEffect } from 'react';
import { useRouter } from '@/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type Company } from '@/app/[locale]/admin/management/companies/types';

export interface Role {
  id: string;
  name: string;
}

// Tipo para os dados iniciais/perfil do usuário, incluindo role_id e email opcional
export interface UserProfileData {
  id?: string; // ID é necessário para edição
  username: string | null;
  full_name: string | null;
  role_id?: string; // Para preencher o select da role
  email?: string | null; // Email pode ser exibido (read-only)
  company_id?: string | null; // Adicionar company_id
}

interface UserFormProps {
  roles: Role[];
  companies?: Company[];
  formType: 'create' | 'edit';
  serverAction: (prevState: any, formData: FormData) => Promise<{ error?: string; success?: boolean; message?: string; newUserId?: string; }>;
  initialData?: UserProfileData;
}

const defaultInitialState: { error?: string; success?: boolean; message?: string; newUserId?: string; } = {
  error: undefined,
  success: false,
  message: undefined,
  newUserId: undefined,
};

export default function UserForm({ 
  roles, 
  companies,
  formType, 
  serverAction, 
  initialData 
}: UserFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [formState, formAction] = useFormState(serverAction, defaultInitialState);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (formState.success && formState.message) {
      toast.success(formState.message);
      router.push('/admin/management/users');
    } 
  }, [formState, router]);

  const buttonTextKey = formType === 'edit' 
    ? (pending ? 'UserManagementPage.submitButtonUpdatingText' : 'UserManagementPage.submitButtonUpdateText') 
    : (pending ? 'UserManagementPage.submitButtonCreatingText' : 'UserManagementPage.submitButtonCreateText');

  return (
    <form action={formAction} className="space-y-6">
      {formState.error && <p className="text-red-500">{formState.error}</p>}
      
      {formType === 'edit' && initialData?.id && (
        <input type="hidden" name="userId" value={initialData.id} />
      )}

      <div>
        <Label htmlFor="email">{t('UserManagementPage.emailLabel')}</Label>
        <Input 
          type="email" 
          id="email" 
          name="email" 
          required 
          placeholder={t('UserManagementPage.emailPlaceholder')} 
          defaultValue={initialData?.email || ''} 
          readOnly={formType === 'edit'}
        />
      </div>

      <div>
        <Label htmlFor="username">{t('UserManagementPage.usernameLabel')}</Label>
        <Input 
          type="text" 
          id="username" 
          name="username" 
          placeholder={t('UserManagementPage.usernamePlaceholder')} 
          defaultValue={initialData?.username || ''} 
        />
      </div>

      <div>
        <Label htmlFor="full_name">{t('UserManagementPage.fullNameLabel')}</Label>
        <Input 
          type="text" 
          id="full_name" 
          name="full_name" 
          placeholder={t('UserManagementPage.fullNamePlaceholder')} 
          defaultValue={initialData?.full_name || ''} 
        />
      </div>
      
      {formType === 'create' && (
        <div>
          <Label htmlFor="password">{t('UserManagementPage.passwordLabel')}</Label>
          <Input 
            type="password" 
            id="password" 
            name="password" 
            required 
            minLength={6} 
            placeholder={t('UserManagementPage.passwordPlaceholder')} 
          />
        </div>
      )}

      <div>
        <Label htmlFor="roleId">{t('UserManagementPage.roleLabel')}</Label>
        <Select name="roleId" required defaultValue={initialData?.role_id} >
          <SelectTrigger>
            <SelectValue placeholder={t('UserManagementPage.selectRolePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.name} 
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="companyId">{t('UserManagementPage.companyLabel')}</Label>
        <Select name="companyId" defaultValue={initialData?.company_id || ''}>
          <SelectTrigger>
            <SelectValue placeholder={t('UserManagementPage.selectCompanyPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {companies?.map(company => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {t(buttonTextKey)}
      </Button>
    </form>
  );
} 