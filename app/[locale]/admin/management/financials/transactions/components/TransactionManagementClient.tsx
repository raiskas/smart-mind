'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

// import TransactionFilters from './TransactionFilters';
import TransactionsTable, { type Transaction as TableTransaction } from './TransactionsTable';
import TransactionFormModal, { type ClientTransactionFormData } from './TransactionFormModal';

// Import da server action
import { getTransactionsForCompany, deleteTransactionAction } from '@/app/actions/transactionActions';
import type { TransactionWithRelatedData } from '@/app/actions/transactionActions'; // Tipo retornado pela action

export default function TransactionManagementClient() {
  const t = useTranslations('Financials.TransactionsPage');
  const tShared = useTranslations('Shared');
  const tGlobal = useTranslations('global');
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<TableTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<TableTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // TODO: Adicionar estado para paginação se necessário no futuro

  const fetchTransactions = useCallback(async (page = 1, pageSize = 10) => {
    setIsLoading(true);
    console.log(`Fetching transactions for page: ${page}, pageSize: ${pageSize}`);

    const result = await getTransactionsForCompany({
      page,
      pageSize,
      sortBy: 'transaction_date',
      sortDirection: 'desc',
    });

    if (result.isSuccess && result.data && result.data.data) {
      const fetchedTransactions: TableTransaction[] = result.data.data.map(item => ({
        id: item.id,
        date: item.transaction_date,
        description: item.description,
        amount: item.amount,
        currencyCode: item.currency_code || 'BRL',
        type: item.type.toLowerCase() as TableTransaction['type'],
        categoryName: item.category_name || undefined,
        financialAccountName: item.financial_account_name || 'N/A',
        contactName: item.contact_name || undefined,
        status: item.status.toLowerCase() as TableTransaction['status'],
        financial_account_id: item.financial_account_id,
        category_id: item.category_id || null,
        currency_id: item.currency_id,
        contact_id: item.contact_id || null,
        notes: item.notes || null,
      }));
      setTransactions(fetchedTransactions);
      // console.log('Pagination data:', result.data.pagination);
    } else {
      console.error("Failed to fetch transactions:", result.message);
      setTransactions([]); // Limpar transações em caso de erro
      // TODO: Mostrar um toast de erro para o usuário
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      handleOpenModalForCreate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModalForCreate = () => {
    setSelectedTransactionForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (transaction: TableTransaction) => {
    setSelectedTransactionForEdit(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransactionForEdit(null);
  };

  const handleTransactionSaveSuccess = () => {
    fetchTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    const confirmationMessage = tShared('deleteConfirmation'); // Usando a tradução para a mensagem de confirmação
    if (window.confirm(confirmationMessage)) {
      console.log("Usuário confirmou a exclusão da transação com ID:", id);
      try {
        const result = await deleteTransactionAction(id);
        if (result.isSuccess) {
          console.log("Transação deletada com sucesso:", id);
          fetchTransactions(); // Recarrega a lista de transações
          // O alert de sucesso foi removido conforme solicitado
        } else {
          console.error("Erro ao deletar transação:", result.message);
          alert(tShared('deleteError', { error: result.message }));
        }
      } catch (error) {
        console.error("Erro inesperado ao deletar transação:", error);
        alert(tShared('deleteError', { error: (error as Error).message || 'Unknown error' }));
      }
    } else {
      console.log("Usuário cancelou a exclusão da transação com ID:", id);
    }
  };

  const getInitialDataForModal = (): (Partial<ClientTransactionFormData> & { id?: string }) | undefined => {
    if (!selectedTransactionForEdit) {
      return undefined;
    }
    const { date, ...restOfData } = selectedTransactionForEdit;
    return {
      ...restOfData,
      id: selectedTransactionForEdit.id,
      transaction_date: date ? new Date(date) : new Date(),
    };
  };

  const filteredTransactions = transactions.filter(transaction => {
    const term = searchTerm.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(term) ||
      (transaction.categoryName && transaction.categoryName.toLowerCase().includes(term)) ||
      (transaction.financialAccountName && transaction.financialAccountName.toLowerCase().includes(term)) ||
      (transaction.contactName && transaction.contactName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Input 
          placeholder={tGlobal('search_placeholder')} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm" 
        />
        <Button onClick={handleOpenModalForCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('newTransactionButton')}
        </Button>
      </div>

      <TransactionsTable
        transactions={filteredTransactions}
        isLoading={isLoading}
        onEdit={handleOpenModalForEdit}
        onDelete={handleDeleteTransaction}
      />

      {isModalOpen && (
        <TransactionFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={getInitialDataForModal()}
          onSuccess={handleTransactionSaveSuccess}
        />
      )}
    </div>
  );
} 