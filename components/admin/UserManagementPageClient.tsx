'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Button } from '@/components/ui/button';
import { type Role as RoleType } from '@/lib/types/screens'; // Usado para availableRoles, pode precisar ajustar o nome/tipo
import { type UserData } from '@/components/admin/UserTable'; // Tipo para usuários na tabela
import UserTable from '@/components/admin/UserTable';
import UserForm, { type UserProfileData, type Role as UserFormRole } from '@/components/admin/UserForm'; // Tipos do UserForm
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createUserAction, updateUserAction } from '@/app/actions/userActions'; // Assumindo que existem
import { type Locale } from '@/i18n';
import { type Company } from '@/app/[locale]/admin/management/companies/types'; // Importar o tipo Company
import { Input } from '@/components/ui/input'; // Adicionar import

interface UserManagementPageClientProps {
  initialUsers: UserData[];
  availableRoles: UserFormRole[]; // Roles para o dropdown do UserForm
  availableCompanies: Company[]; // Adicionar availableCompanies
  userIsAdmin: boolean;
  locale: Locale;
}

export default function UserManagementPageClient({
  initialUsers,
  availableRoles,
  availableCompanies, // Adicionar availableCompanies
  userIsAdmin,
  locale,
}: UserManagementPageClientProps) {
  const t = useTranslations('UserManagementPage'); // Namespace para traduções
  const tGlobal = useTranslations('global'); // Adicionar tGlobal
  const router = useRouter();

  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Adicionar estado searchTerm
  // UserProfileData é o tipo esperado por UserForm para initialData
  const [currentUserData, setCurrentUserData] = useState<UserProfileData | null>(null);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  if (!userIsAdmin) {
    useEffect(() => {
      router.push('/');
    }, [router]);
    return <p>{t('accessDenied')}</p>; 
  }

  const handleOpenCreateModal = () => {
    setCurrentUserData(null); // Limpa dados para criação
    setModalType('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserData) => {
    // Mapear UserData (da tabela) para UserProfileData (do formulário)
    const formData: UserProfileData = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role_id: user.roles?.id, // Agora user.roles.id está disponível em UserData
      email: user.email, // Email agora está disponível em UserData
      company_id: user.company_id, // Adicionar company_id
    };
    setCurrentUserData(formData);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const onModalOpenChange = (open: boolean) => {
    if (!open) {
      setModalType(null);
      setCurrentUserData(null);
    }
    setIsModalOpen(open);
  };

  const handleFormAction = async (prevState: any, formData: FormData): Promise<any> => {
    let result;
    if (modalType === 'create') {
      result = await createUserAction(prevState, formData);
    } else if (modalType === 'edit' && currentUserData?.id) {
      // Adicionar userId ao formData se a action não o extrair (UserForm já faz isso com input hidden)
      result = await updateUserAction(prevState, formData);
    } else {
      return { error: t('errors.invalidModalTypeOrId') }; // Usar tradução
    }

    if (result?.success) {
      setIsModalOpen(false);
      router.refresh(); // Atualiza os dados da página (Server Component irá buscar novamente)
    }
    // Retorna o resultado para que useFormState do UserForm possa exibir erros/mensagens
    return result; 
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(term) ||
      user.full_name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term)
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
        <Button onClick={handleOpenCreateModal}>
          {t('createUserButton')}
        </Button>
      </div>

      {filteredUsers && filteredUsers.length > 0 ? (
        <UserTable users={filteredUsers} onEditUser={handleOpenEditModal} />
      ) : (
        <p>{t('noUsersFound')}</p>
      )}

      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'create' ? t('createModalTitle') : t('editUserTitle', { userName: currentUserData?.username || currentUserData?.full_name || '' })}
            </DialogTitle>
            <DialogDescription>
              {modalType === 'create' ? t('createModalDescription') : t('editUserDescription')}
            </DialogDescription>
          </DialogHeader>
          {(modalType === 'create' || (modalType === 'edit' && currentUserData)) && (
            <UserForm
              formType={modalType}
              serverAction={handleFormAction} 
              initialData={modalType === 'edit' ? currentUserData! : undefined}
              roles={availableRoles}
              companies={availableCompanies}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 