'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { usePathname, useRouter } from '@/navigation'; // useRouter e usePathname de @/navigation
import { useSearchParams } from 'next/navigation'; // useSearchParams de next/navigation
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button'; // Button não está sendo usado no momento
// Importar o TransactionsTable e o tipo Transaction (ou um tipo específico para Payables se criado)
import TransactionsTable, { type Transaction as DisplayTransaction } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionsTable';
import { getTransactionsForCompany, type TransactionWithRelatedData, deleteTransactionAction } from '@/app/actions/transactionActions'; // Importar a action e o deleteTransactionAction
import { type ActionResponse } from '@/lib/types/actions'; // Caminho corrigido e tipo renomeado para ActionResponse
import { toast } from 'sonner'; // Para notificações
import TransactionFormModal, { type ClientTransactionFormData } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionFormModal'; // Importar modal

interface PayablesPageClientProps {
  initialPayables: TransactionWithRelatedData[]; // Alterado para TransactionWithRelatedData
  totalCount: number;
  totalAmountFiltered: number; // Nova prop
  // Adicionar quaisquer outras props necessárias, como traduções específicas
}

// Função helper para formatar moeda (simples, pode ser melhorada ou movida para utils)
const formatCurrency = (amount: number, currencyCode = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', { // Usar 'pt-BR' para formatação brasileira
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function PayablesPageClient({ 
  initialPayables,
  totalCount,
  totalAmountFiltered, // Receber a nova prop
}: PayablesPageClientProps) {
  const t = useTranslations('Financials.PayablesPage');
  const tShared = useTranslations('Shared');
  const tGlobal = useTranslations('global');
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [payables, setPayables] = useState<TransactionWithRelatedData[]>(initialPayables); // Alterado
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const size = searchParams.get('pageSize');
    return size ? parseInt(size, 10) : 10;
  });
  const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);
  const [currentTotalAmountFiltered, setCurrentTotalAmountFiltered] = useState(totalAmountFiltered); // Novo estado
  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchTerm') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<TransactionWithRelatedData | null>(null); // Alterado

  const fetchPayables = useCallback(async (page = currentPage, size = pageSize, term = searchTerm) => {
    console.log(`PayablesPageClient: Fetching payables. Page: ${page}, Size: ${size}, Term: ${term}`);
    setIsLoading(true);
    // Não usar startTransition aqui, pois queremos que o estado de loading da tabela seja imediato.
    const result = await getTransactionsForCompany({
      page,
      pageSize: size,
      description: term,
      type: 'expense',
      status: ['pending', 'overdue'],
      sortBy: 'transaction_date',
      sortDirection: 'asc'
    });

    if (result.isSuccess && result.data) {
      setPayables(result.data.data);
      setCurrentTotalCount(result.data.pagination.totalCount);
      setCurrentTotalAmountFiltered(result.data.totalAmountFiltered || 0); // Atualizar o total
    } else {
      toast.error(t('errorLoadingPayables'), { description: result.message });
      setPayables([]); // Limpar em caso de erro
      setCurrentTotalCount(0);
    }
    setIsLoading(false);
  }, [currentPage, pageSize, searchTerm, t]);

  // Efeito para atualizar a URL quando paginação ou busca mudam
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', currentPage.toString());
    params.set('pageSize', pageSize.toString());
    if (searchTerm) {
      params.set('searchTerm', searchTerm);
    } else {
      params.delete('searchTerm');
    }
    router.replace(`${pathname}?${params.toString()}` as any, { scroll: false });
  }, [currentPage, pageSize, searchTerm, pathname, router, searchParams]);

  // Efeito para buscar dados quando os parâmetros da URL (lidos no estado inicial) mudam
  // Isso é útil se o usuário navega diretamente para uma URL com page/pageSize/searchTerm
  // Ou se usarmos router.push para mudar os searchParams externamente.
  useEffect(() => {
    // A busca inicial já é feita pelo server component. 
    // Esta busca no cliente é para quando os searchParams mudam DEPOIS do carregamento inicial
    // E queremos que o cliente se atualize sem um full-page reload.
    // No entanto, o `useEffect` acima já atualiza a URL, o que pode levar o Server Component a recarregar.
    // A lógica de fetchPayables pode ser chamada diretamente por handlePageChange e handleSearchKeyDown
    // Para evitar buscas duplicadas, vamos manter fetchPayables sendo chamado explicitamente nas ações do usuário.
  }, [searchParams, fetchPayables]); // Removido fetchPayables daqui para evitar loop se ele não for estável

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setCurrentPage(1);
      startTransition(() => {
        fetchPayables(1, pageSize, searchTerm);
      });
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    startTransition(() => {
      fetchPayables(newPage, pageSize, searchTerm);
    });
  };

  const handleOpenModalForEdit = (payable: TransactionWithRelatedData) => { // Agora recebe TransactionWithRelatedData
    setEditingPayable(payable);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayable(null);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    toast.success(tGlobal('messages.update_success', { item: t('singularPayableName') }));
    startTransition(() => { fetchPayables(currentPage, pageSize, searchTerm); });
  };
  
  const getInitialDataForModal = (): (Partial<ClientTransactionFormData> & { id?: string }) | undefined => {
    if (!editingPayable) return undefined;
    
    const modalData = {
      id: editingPayable.id,
      description: editingPayable.description,
      amount: editingPayable.amount,
      transaction_date: editingPayable.transaction_date ? new Date(editingPayable.transaction_date) : new Date(),
      type: editingPayable.type,
      status: editingPayable.status,
      financial_account_id: editingPayable.financial_account_id,
      category_id: editingPayable.category_id,
      contact_id: editingPayable.contact_id,
      currency_id: editingPayable.currency_id,
      notes: editingPayable.notes,
    };

    console.log('[PayablesPageClient] Data for Modal:', modalData);
    return modalData;
  };

  const handleDeletePayable = async (payableId: string) => {
    const confirmed = window.confirm(tGlobal('confirm_delete_prompt')); // Usar tradução global
    if (confirmed) {
      setIsLoading(true); // Pode ser útil um estado de loading específico para a linha/botão
      startTransition(async () => {
        const result = await deleteTransactionAction(payableId);
        if (result.isSuccess) {
          toast.success(tGlobal('messages.delete_success', { item: t('singularPayableName') }));
          fetchPayables(currentPage, pageSize, searchTerm); // Recarregar dados
        } else {
          toast.error(tGlobal('errors.failedToLoadData'), { description: result.message }); // Usar tradução mais genérica ou criar uma específica
        }
        setIsLoading(false);
      });
    }
  };

  // Função para mapear para a tabela
  const mapToTableTransactions = (data: TransactionWithRelatedData[]): DisplayTransaction[] => {
    return data.map(p => ({
      id: p.id,
      date: p.transaction_date,
      description: p.description,
      amount: p.amount,
      currencyCode: p.currency_code || 'BRL',
      type: p.type,
      categoryName: p.category_name === null ? undefined : p.category_name,
      financialAccountName: p.financial_account_name || 'N/A',
      contactName: p.contact_name === null ? undefined : p.contact_name,
      status: p.status,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={tGlobal('search_placeholder')} // Usar tradução global para o placeholder
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown} // Corrigido para handleSearchKeyDown
          className="max-w-sm"
        />
        {/* Botão de "Nova Conta a Pagar" pode ser adicionado aqui, mas geralmente se adiciona uma transação de despesa */}
      </div>

      {/* Exibir o total devido */} 
      {currentTotalAmountFiltered > 0 && (
        <div className="text-lg font-semibold text-right pr-2">
          {t('totalDueLabel')}: {formatCurrency(currentTotalAmountFiltered)}
        </div>
      )}

      {(isLoading || isTransitioning) && <p>{tGlobal('loading')}...</p>}
      {!isLoading && !isTransitioning && payables.length === 0 && (
        <p className="text-center py-4">{t('noPayablesFound')}</p> // Nova tradução necessária
      )}
      {!isLoading && !isTransitioning && payables.length > 0 && (
        <TransactionsTable
          transactions={mapToTableTransactions(payables)} // Mapear aqui
          isLoading={isLoading || isTransitioning} // Passar o estado de carregamento/transição
          onEdit={(transaction) => {
            // Encontrar o item original completo para abrir o modal
            const originalPayable = payables.find(p => p.id === transaction.id);
            if (originalPayable) handleOpenModalForEdit(originalPayable);
          }}
          onDelete={handleDeletePayable}
        />
      )}

      {isModalOpen && editingPayable && (
        <TransactionFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={getInitialDataForModal()} // Agora usa editingPayable que tem todos os dados
          onSuccess={handleSaveSuccess} // Usar a nova função
          // companyId é obtido no server action, não precisa passar aqui
        />
      )}
    </div>
  );
} 