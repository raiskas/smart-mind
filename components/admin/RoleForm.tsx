'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SYSTEM_SCREENS, type Screen, type ScreenPermission } from '@/lib/types/screens';
import { type RoleWithPermissions } from '@/lib/authUtils';

interface RoleFormData {
  id?: string;
  name: string;
  isMaster: boolean;
  screenPermissions: ScreenPermission[];
}

interface RoleFormProps {
  formType: 'create' | 'edit';
  serverAction: (prevState: any, formData: FormData) => Promise<{ error?: string; fieldErrors?: { name?: string[] }; success?: boolean; message?: string; }>;
  initialData?: RoleFormData;
}

export default function RoleForm({ formType, serverAction, initialData }: RoleFormProps) {
  const router = useRouter();
  const t = useTranslations('RoleManagementPage');
  const [state, formAction] = useFormState(serverAction, null);
  const { pending } = useFormStatus();

  // Log 1: Verificar initialData recebido pelo componente
  console.log('[RoleForm] initialData recebido:', JSON.stringify(initialData, null, 2));

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      router.push('/admin/management/roles');
    } else if (state?.error) {
      if (state.fieldErrors?.name) {
        toast.error(`${t('roleNameLabel')}: ${state.fieldErrors.name.join(', ')}`);
      } else {
        toast.error(state.error);
      }
    }
  }, [state, router, t]);

  const buttonTextKey = formType === 'create' 
    ? (pending ? 'submitButtonCreatingRoleText' : 'submitButtonCreateRoleText')
    : (pending ? 'submitButtonUpdatingRoleText' : 'submitButtonUpdateRoleText');

  const screensByModule = SYSTEM_SCREENS.reduce((acc, screen) => {
    if (!acc[screen.module]) {
      acc[screen.module] = [];
    }
    acc[screen.module].push(screen);
    return acc;
  }, {} as Record<string, Screen[]>);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && !state.fieldErrors && (
         <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}

      {formType === 'edit' && (
        <input type="hidden" name="roleId" value={initialData?.id} />
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">{t('roleNameLabel')}</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initialData?.name || ''}
            placeholder={t('roleNamePlaceholder')}
            required
            aria-describedby="name-error"
          />
          {state?.fieldErrors?.name && (
             <p id="name-error" className="text-sm font-medium text-destructive">
                {state.fieldErrors.name.join(', ')}
             </p>
           )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isMaster"
            name="isMaster"
            defaultChecked={initialData?.isMaster || false}
          />
          <Label htmlFor="isMaster">{t('isMasterLabel')}</Label>
        </div>

        <div className="space-y-4">
          <Label>{t('screenPermissionsLabel')}</Label>
          {Object.entries(screensByModule).map(([module, screens]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle>{module}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {screens.map((screen) => {
                    // Log 2: Verificar screen.id atual
                    console.log(`[RoleForm] Mapeando screen: ${screen.name} (ID: ${screen.id})`);

                    // Achar permissão inicial para esta tela
                    const permission = initialData?.screenPermissions?.find(
                      p => p.screenId === screen.id
                    );

                    // Log 3: Verificar a permissão encontrada
                    console.log(`[RoleForm] Permissão encontrada para ${screen.id}:`, permission);

                    // Calcular valores defaultChecked (para log)
                    const defaultView = permission?.canView || false;
                    const defaultEdit = permission?.canEdit || false;
                    const defaultDelete = permission?.canDelete || false;

                    // Log 4: Verificar valores defaultChecked
                    console.log(`[RoleForm] defaultChecked para ${screen.id}: view=${defaultView}, edit=${defaultEdit}, delete=${defaultDelete}`);

                    return (
                      <div key={screen.id} className="space-y-2">
                        <div className="font-medium">{screen.name}</div>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`view-${screen.id}`}
                              name={`permissions[${screen.id}].canView`}
                              defaultChecked={defaultView}
                            />
                            <Label htmlFor={`view-${screen.id}`}>{t('canViewLabel')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${screen.id}`}
                              name={`permissions[${screen.id}].canEdit`}
                              defaultChecked={defaultEdit}
                            />
                            <Label htmlFor={`edit-${screen.id}`}>{t('canEditLabel')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`delete-${screen.id}`}
                              name={`permissions[${screen.id}].canDelete`}
                              defaultChecked={defaultDelete}
                            />
                            <Label htmlFor={`delete-${screen.id}`}>{t('canDeleteLabel')}</Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {t(buttonTextKey)}
      </Button>
    </form>
  );
} 