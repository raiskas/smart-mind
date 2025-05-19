'use client';

import React, { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { useTranslations } from 'next-intl';

import { CompanyData, CurrencyData, CompanyWithDetails, Company as CompanyType } from './types'; // Types from the parent page
import { createCompanyAction, updateCompanyAction, CreateCompanyFormState } from '../../../../actions/companyActions';
// Placeholder for actual UI components. Assuming Shadcn/UI components will be used later.
import { Button } from '../../../../../components/ui/button'; 
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import CompanyForm from './CompanyForm'; // Import the new form
import { CompanyTable } from './CompanyTable'; // Import CompanyTable
import { toast } from 'sonner'; // For toasts
import { useRouter } from 'next/navigation'; // For refreshing data

const initialFormStateForParent: CreateCompanyFormState = { message: '', errors: [] };

type CompanyManagementPageClientProps = {
  initialCompanies: CompanyData[];
  currencies: CurrencyData[];
};

export default function CompanyManagementPageClient({
  initialCompanies,
  currencies,
}: CompanyManagementPageClientProps) {
  const t = useTranslations('Admin.CompanyManagement');
  const tShared = useTranslations('Shared'); // For common terms like Save, Cancel, Edit, Delete
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyData[]>(initialCompanies);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);

  // Effect to update local companies state if initialCompanies prop changes (e.g., after revalidation)
  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  // These form states in the parent can be used for global feedback if needed,
  // e.g., showing a global toast or disabling the "Add Company" button during submission.
  // The CompanyForm itself will have its own useFormState for field errors and form-specific messages.
  const [createState, parentCreateFormAction] = useFormState(createCompanyAction, initialFormStateForParent);
  const [updateState, parentUpdateFormAction] = useFormState(updateCompanyAction, initialFormStateForParent);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    
    // Determinar sucesso pela ausência de erros e mensagem apropriada
    if (editingCompany) { // Estava editando
        if (!updateState.errors?.length && updateState.message.toLowerCase().includes('success')) {
            toast.success(updateState.message || t('toast.updateSuccess'));
        }
        // Não mostrar erro aqui, useEffect abaixo cuida disso
    } else { // Estava criando
        if (!createState.errors?.length && createState.message.toLowerCase().includes('success')) {
            toast.success(createState.message || t('toast.createSuccess'));
        }
        // Não mostrar erro aqui, useEffect abaixo cuida disso
    }
    router.refresh();
  };
  
  useEffect(() => {
    // Mostrar toast de erro se a action retornou erros ou uma mensagem que não indica sucesso
    if (createState.message && (createState.errors?.length || !createState.message.toLowerCase().includes('success'))) {
        toast.error(`${t('toast.createErrorDetails')} ${createState.message}`);
    }
  }, [createState, t]);

  useEffect(() => {
    if (updateState.message && (updateState.errors?.length || !updateState.message.toLowerCase().includes('success'))) {
      toast.error(`${t('toast.updateErrorDetails')} ${updateState.message}`);
    }
  }, [updateState, t]);

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (company: CompanyType) => { 
    // A tabela passa Company (de types.ts), mas o formulário talvez espere CompanyData.
    // Se forem compatíveis, ok. Caso contrário, mapear os campos.
    // Por agora, assumindo que CompanyData é o que o formulário precisa para initialData.
    setEditingCompany(company as CompanyData); 
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleDeleteSuccess = () => {
    // A mensagem de sucesso/erro já é tratada pelo CompanyTable via toast.
    // A revalidação do path pela server action deve atualizar initialCompanies.
    // Forçar refresh aqui garante que os dados sejam atualizados.
    router.refresh();
    // Poderia também fechar um modal se a exclusão fosse disparada de um contexto diferente
  };

  const currentAction = editingCompany ? updateCompanyAction : createCompanyAction;
  const formInitialState = editingCompany ? 
                           { message: '', errors: [], ...editingCompany } : 
                           initialFormStateForParent;

  // Preparar dados para CompanyTable, juntando nome da moeda
  const companiesForTable: CompanyWithDetails[] = companies.map(comp => {
    const currency = currencies.find(curr => curr.id === comp.default_currency_id);
    return {
      ...comp,
      official_name: comp.official_name === undefined ? null : comp.official_name,
      tax_id: comp.tax_id === undefined ? null : comp.tax_id,
      // Agora default_currency_id em Company (e CompanyWithDetails) é string | null.
      // CompanyData.default_currency_id é string | null | undefined.
      // Se for undefined, converter para null. Se for string ou null, manter.
      default_currency_id: comp.default_currency_id === undefined ? null : comp.default_currency_id,
      currency_name: currency?.name || 'N/A',
      currency_code: currency?.code || 'N/A',
    } as CompanyWithDetails;
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleOpenCreateModal}>{t('buttons.addCompany')}</Button>
      </div>

      {/* Substituir a lista placeholder pela CompanyTable */}
      <CompanyTable 
        companies={companiesForTable} 
        onEdit={handleOpenEditModal} 
        onDeleteSuccess={handleDeleteSuccess} 
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md border">
            <h3 className="text-xl font-semibold mb-4">
              {editingCompany ? t('modal.editTitle') : t('modal.createTitle')}
            </h3>
            <CompanyForm
              formAction={currentAction} // Pass the raw server action
              initialFormState={formInitialState} // Pass the initial state for the form
              initialData={editingCompany}
              currencies={currencies}
              onFormSubmitSuccess={handleFormSuccess} 
              onCancel={handleCloseModal} 
            />
          </div>
        </div>
      )}
    </div>
  );
} 