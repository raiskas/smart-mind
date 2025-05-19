'use client';

// import { useTranslations } from 'next-intl';
// Componentes de UI para filtros (ex: Input, Select, DatePicker) virão aqui

interface TransactionFiltersProps {
  // onFilterChange: (filters: any) => void; // Callback para notificar sobre mudanças nos filtros
}

export default function TransactionFilters({ /* onFilterChange */ }: TransactionFiltersProps) {
  // const t = useTranslations('Financials.TransactionsPage.filters'); // Namespace sugerido

  return (
    <div className="p-4 border rounded-md">
      <p className="text-sm text-muted-foreground">Filtros de Transação aparecerão aqui.</p>
      {/* Exemplo de campos de filtro (a serem implementados):
      <Input placeholder={t('descriptionPlaceholder')} />
      <Select defaultValue="all">
        <SelectTrigger><SelectValue placeholder={t('typePlaceholder')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Tipos</SelectItem>
          <SelectItem value="income">{t('transactionTypes.INCOME')}</SelectItem>
          <SelectItem value="expense">{t('transactionTypes.EXPENSE')}</SelectItem>
        </SelectContent>
      </Select>
      <DatePicker placeholder={t('startDate')} /> 
      */}
    </div>
  );
} 