'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { usePathname, useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import TransactionsTable, { type Transaction as DisplayTransaction } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionsTable';
import { getTransactionsForCompany, type TransactionWithRelatedData, deleteTransactionAction } from '@/app/actions/transactionActions';
import { type ActionResponse } from '@/lib/types/actions';
import { toast } from 'sonner';
import TransactionFormModal, { type ClientTransactionFormData } from '@/app/[locale]/admin/management/financials/transactions/components/TransactionFormModal';

interface ReceivablesPageClientProps {
  initialReceivables: TransactionWithRelatedData[];
  totalCount: number;
  totalAmountFiltered: number;
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

export function ReceivablesPageClient({ 
  initialReceivables,
  totalCount,
  totalAmountFiltered,
}: ReceivablesPageClientProps) {
  const t = useTranslations('Financials.ReceivablesPage');
  const tShared = useTranslations('Shared');
  const tGlobal = useTranslations('global');
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [receivables, setReceivables] = useState<TransactionWithRelatedData[]>(initialReceivables);
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const size = searchParams.get('pageSize');
    return size ? parseInt(size, 10) : 10;
  });
  const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);
  const [currentTotalAmountFiltered, setCurrentTotalAmountFiltered] = useState(totalAmountFiltered);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchTerm') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<TransactionWithRelatedData | null>(null);

  const fetchReceivables = useCallback(async (page = currentPage, size = pageSize, term = searchTerm) => {
    console.log(`ReceivablesPageClient: Fetching receivables. Page: ${page}, Size: ${size}, Term: ${term}`);
    setIsLoading(true);
    const result = await getTransactionsForCompany({
      page,
      pageSize: size,
      description: term,
      type: 'income', // Tipo 'income' para Contas a Receber
      status: ['pending', 'overdue'], // Status para Contas a Receber
      sortBy: 'transaction_date',
      sortDirection: 'asc'
    });

    if (result.isSuccess && result.data) {
      setReceivables(result.data.data);
      setCurrentTotalCount(result.data.pagination.totalCount);
      setCurrentTotalAmountFiltered(result.data.totalAmountFiltered || 0);
    } else {
      toast.error(t('errorLoadingReceivables'), { description: result.message });
      setReceivables([]);
      setCurrentTotalCount(0);
    }
    setIsLoading(false);
  }, [currentPage, pageSize, searchTerm, t]);

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

  // useEffect para buscar dados quando os parâmetros da URL mudam (não invocado na carga inicial)
  // A lógica de fetchReceivables é chamada explicitamente nas ações do usuário (handlePageChange, handleSearchKeyDown)
  // para evitar buscas duplicadas e garantir que o estado seja atualizado antes de uma nova busca.

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setCurrentPage(1); // Resetar para a primeira página ao buscar
      startTransition(() => {
        fetchReceivables(1, pageSize, searchTerm);
      });
    }
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    startTransition(() => {
      fetchReceivables(newPage, pageSize, searchTerm);
    });
  };

  const handleOpenModalForEdit = (receivable: TransactionWithRelatedData) => {
    setEditingReceivable(receivable);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReceivable(null);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
    toast.success(tGlobal('messages.update_success', { item: t('singularReceivableName') }));
    startTransition(() => { fetchReceivables(currentPage, pageSize, searchTerm); });
  };
  
  const getInitialDataForModal = (): (Partial<ClientTransactionFormData> & { id?: string }) | undefined => {
    if (!editingReceivable) return undefined;
    
    return {
      id: editingReceivable.id,
      description: editingReceivable.description,
      amount: editingReceivable.amount,
      transaction_date: editingReceivable.transaction_date ? new Date(editingReceivable.transaction_date) : new Date(),
      type: 'income', // Forçar tipo 'income' para o modal
      status: editingReceivable.status,
      financial_account_id: editingReceivable.financial_account_id,
      category_id: editingReceivable.category_id,
      contact_id: editingReceivable.contact_id,
      currency_id: editingReceivable.currency_id,
      notes: editingReceivable.notes,
    };
  };

  const handleDeleteReceivable = async (receivableId: string) => {
    const confirmed = window.confirm(tGlobal('confirm_delete_prompt'));
    if (confirmed) {
      setIsLoading(true);
      startTransition(async () => {
        const result = await deleteTransactionAction(receivableId);
        if (result.isSuccess) {
          toast.success(tGlobal('messages.delete_success', { item: t('singularReceivableName') }));
          fetchReceivables(currentPage, pageSize, searchTerm);
        } else {
          toast.error(tGlobal('errors.failedToLoadData'), { description: result.message });
        }
        setIsLoading(false);
      });
    }
  };

  const mapToTableTransactions = (data: TransactionWithRelatedData[]): DisplayTransaction[] => {
    return data.map(r => ({
      id: r.id,
      date: r.transaction_date,
      description: r.description,
      amount: r.amount,
      currencyCode: r.currency_code || 'BRL',
      type: r.type,
      categoryName: r.category_name === null ? undefined : r.category_name,
      financialAccountName: r.financial_account_name || 'N/A',
      contactName: r.contact_name === null ? undefined : r.contact_name,
      status: r.status,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={tGlobal('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="max-w-sm"
        />
        {/* O botão de "Nova Conta a Receber" pode ser um TransactionFormModal pré-configurado para 'income' */}
        {/* ou uma action específica. Por enquanto, mantemos sem o botão direto aqui. */}
        {/* A criação de novas transações (incluindo receitas) é feita pela página de Transações */}
      </div>

      {/* Exibir o total a receber */} 
      {currentTotalAmountFiltered > 0 && (
        <div className="text-lg font-semibold text-right pr-2">
          {t('totalReceivableLabel')}: {formatCurrency(currentTotalAmountFiltered)}
        </div>
      )}

      {(isLoading || isTransitioning) && <p>{tGlobal('loading')}...</p>}
      {!isLoading && !isTransitioning && receivables.length === 0 && (
        <p className="text-center py-4">{t('noReceivablesFound')}</p> 
      )}
      {!isLoading && !isTransitioning && receivables.length > 0 && (
        <TransactionsTable
          transactions={mapToTableTransactions(receivables)}
          isLoading={isLoading || isTransitioning}
          onEdit={(transaction) => {
            const originalReceivable = receivables.find(r => r.id === transaction.id);
            if (originalReceivable) handleOpenModalForEdit(originalReceivable);
          }}
          onDelete={handleDeleteReceivable}
          // Não precisamos de onMarkAsPaid/Unpaid aqui, pois o status é gerenciado pelo TransactionFormModal
        />
      )}

      {isModalOpen && editingReceivable && (
        <TransactionFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={getInitialDataForModal()}
          onSuccess={handleSaveSuccess}
          defaultType="income" // Passar 'income' como tipo padrão para o modal
        />
      )}
    </div>
  );
} 