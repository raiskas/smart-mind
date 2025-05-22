'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Manter client aqui, pois é um client component
// Removido: import { getTranslations } from 'next-intl/server'; // Não deve ser usado em client component
import { useTranslations } from 'next-intl';
import { type Locale } from '@/i18n'; // Removido locales, defaultLocale se não usados diretamente
import { useRouter } from '@/navigation'; // Link removido se não usado diretamente aqui
import { Button } from '@/components/ui/button';
// Removido: import { isAdmin } from '@/lib/authUtils'; // isAdmin é verificado no server component pai
import { type Role } from '@/lib/types/screens';
import RoleTable from '@/components/admin/RoleTable';
import RoleForm from '@/components/admin/RoleForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Removido se não usado diretamente (Dialog é controlado por `open`)
  // DialogFooter, // Removido se não usado diretamente
  // DialogClose // Removido se não usado diretamente
} from "@/components/ui/dialog";
import { createRoleAction, updateRoleAction } from '@/app/actions/roleActions';
import { Input } from '@/components/ui/input';

interface RoleFormData {
  id?: string;
  name: string;
  isMaster: boolean;
  screenPermissions: Array<{ screenId: string; canView: boolean; canEdit: boolean; canDelete: boolean; }>;
}

interface RoleManagementPageClientProps { // Renomeado de RoleManagementPageProps
  initialRoles: Role[];
  userIsAdmin: boolean; // Esta prop será crucial
  locale: Locale;
}

// Renomeado de RoleManagementPageClient para RoleManagementPageClient (já era, mas confirmando)
export default function RoleManagementPageClient({ initialRoles, userIsAdmin, locale }: RoleManagementPageClientProps) {
  const t = useTranslations('RoleManagementPage');
  const tGlobal = useTranslations('global');
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
  const [currentRoleData, setCurrentRoleData] = useState<RoleFormData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  // A lógica de redirecionamento se !userIsAdmin é crítica aqui
  if (!userIsAdmin) {
    useEffect(() => {
      // Idealmente, este redirecionamento deveria acontecer no Server Component antes de renderizar este.
      // Mas como uma segunda barreira, ou se userIsAdmin mudar dinamicamente (improvável aqui), ele age.
      router.push('/');
    }, [router]); // Adicionado router como dependência
    return <p>{t('accessDenied')}</p>; // Mostra mensagem enquanto redireciona
  }

  const handleOpenCreateModal = () => {
    setCurrentRoleData(null);
    setModalType('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: Role) => {
    setCurrentRoleData(role as RoleFormData); // Asserção de tipo mantida por enquanto
    setModalType('edit');
    setIsModalOpen(true);
  };

  const onModalOpenChange = (open: boolean) => {
    if (!open) {
      setModalType(null);
      setCurrentRoleData(null);
    }
    setIsModalOpen(open);
  };
  
  const handleFormAction = async (prevState: any, formData: FormData): Promise<any> => {
    let result;
    if (modalType === 'create') {
      result = await createRoleAction(prevState, formData);
    } else if (modalType === 'edit' && currentRoleData?.id) {
      // Passando o ID da role para updateRoleAction explicitamente se necessário
      // formData.append('id', currentRoleData.id); // Adicionar se a action não extrair do FormData
      result = await updateRoleAction(prevState, formData);
    } else {
      return { error: 'Invalid modal type or missing role ID' };
    }

    if (result?.success) {
      setIsModalOpen(false);
      // router.refresh() pode não ser suficiente se initialRoles vier de um Server Component.
      // Uma melhor atualização pode ser necessária, ou confiar que o layout pai se atualiza.
      // Por agora, router.refresh() é o padrão.
      router.refresh(); 
    }
    return result;
  };

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Input 
          placeholder={tGlobal('search_placeholder')} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleOpenCreateModal}>
          {t('createRoleButton')}
        </Button>
      </div>

      {filteredRoles && filteredRoles.length > 0 ? (
        <RoleTable roles={filteredRoles} onEditRole={handleOpenEditModal} />
      ) : (
        <p>{t('noRolesFound')}</p>
      )}

      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? t('createTitle') : t('editTitle', { roleName: currentRoleData?.name || '' })}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'create' ? t('createDescription') : t('editDescription')}
            </DialogDescription>
          </DialogHeader>
          {(modalType === 'create' || (modalType === 'edit' && currentRoleData)) && (
            <RoleForm
              formType={modalType}
              serverAction={handleFormAction}
              initialData={modalType === 'edit' ? currentRoleData! : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 