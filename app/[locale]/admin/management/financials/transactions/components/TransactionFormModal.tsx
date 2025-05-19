'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { transactionTypeValues, transactionStatusValues } from '@/lib/constants/financial';
import { createTransactionAction, updateTransactionAction } from '@/app/actions/transactionActions';
import { getFinancialAccountsForSelectAction } from '@/app/actions/financialAccountActions';
import { getTransactionCategoriesForSelectAction } from '@/app/actions/transactionCategoryActions';
import type { ActionResponse } from '@/lib/types/actions';
import type { Transaction } from '@/lib/schemas/transaction';

// Mock data types for selects - Em um cenário real, viriam de server actions/API
export interface SelectOption {
  value: string;
  label: string;
}

export interface FinancialAccountOption extends SelectOption {
  currency_id: string;
  currency_code: string;
}

// Usaremos uma versão adaptada do CreateTransactionSchema para o formulário.
// Principalmente para facilitar a tipagem e campos opcionais que podem ser obrigatórios no backend mas preenchidos de outra forma.
export const ClientTransactionFormSchema = z.object({
  description: z.string().min(1, { message: 'Descrição é obrigatória.' }),
  amount: z.coerce.number({
    required_error: 'Valor é obrigatório.',
    invalid_type_error: 'Valor deve ser um número.',
  }).positive({ message: 'Valor deve ser positivo.' }),
  transaction_date: z.date({ required_error: 'Data é obrigatória.' }),
  type: z.enum(transactionTypeValues, { required_error: 'Tipo é obrigatório.' }),
  status: z.enum(transactionStatusValues, { required_error: 'Status é obrigatório.' }),
  financial_account_id: z.string().uuid({ message: 'Conta Financeira é obrigatória.' }),
  category_id: z.string().uuid({ message: 'ID da Categoria inválido.' }).nullable().optional(),
  currency_id: z.string().uuid({ message: 'Moeda é obrigatória e definida pela conta.' }), // Será preenchido via conta
  contact_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ClientTransactionFormData = z.infer<typeof ClientTransactionFormSchema>;

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<ClientTransactionFormData> & { id?: string }; // id para edição
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: TransactionFormModalProps) {
  const tModal = useTranslations('admin.financials.transactions.formModal');
  const tShared = useTranslations('Shared');
  const tTransactionTypes = useTranslations('Common.TransactionCategoryTypes');
  const tTransactionStatus = useTranslations('Common.TransactionStatus');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Estado para as opções dos selects
  const [financialAccountOptions, setFinancialAccountOptions] = useState<FinancialAccountOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [isLoadingFinancialAccounts, setIsLoadingFinancialAccounts] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  // Moeda será derivada da conta financeira

  const { 
    control, 
    handleSubmit, 
    register, 
    reset,
    setValue, // Para definir currency_id dinamicamente
    watch,    // Para observar mudanças no tipo de transação e filtrar categorias
    formState: { errors }
  } = useForm<ClientTransactionFormData>({
    resolver: zodResolver(ClientTransactionFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      transaction_date: new Date(),
      type: undefined,
      status: undefined,
      financial_account_id: '',
      category_id: null,
      currency_id: '', // Será preenchido
      contact_id: null,
      notes: null,
      ...(initialData ? {
        ...initialData,
        amount: initialData.amount || 0,
        transaction_date: initialData.transaction_date ? new Date(initialData.transaction_date) : new Date(),
      } : {}),
    },
  });

  const selectedTransactionType = watch('type');

  // Simular carregamento de dados para selects
  // useEffect(() => {
  //   if (isOpen) {
  //     // TODO: Substituir por chamadas a server actions reais
  //     // Ex: getFinancialAccountsForSelect().then(setFinancialAccountOptions);
  //     // Ex: getTransactionCategoriesForSelect().then(setCategoryOptions);
      
  //     // Mock data:
  //     setFinancialAccountOptions([
  //       { value: 'uuid-conta-1', label: 'Conta Corrente BB (BRL)', currency_id: 'uuid-brl', currency_code: 'BRL' },
  //       { value: 'uuid-conta-2', label: 'Conta Poupança Itaú (BRL)', currency_id: 'uuid-brl', currency_code: 'BRL' },
  //       { value: 'uuid-conta-3', label: 'Conta Internacional (USD)', currency_id: 'uuid-usd', currency_code: 'USD' },
  //     ]);
  //     // Categorias podem ser filtradas pelo tipo de transação
  //     // Aqui mostramos todas, a lógica de filtro pode ser adicionada
  //     setCategoryOptions([
  //       { value: 'uuid-cat-salario', label: 'Salário (Receita)' },
  //       { value: 'uuid-cat-aluguel', label: 'Aluguel (Despesa)' },
  //       { value: 'uuid-cat-mercado', label: 'Supermercado (Despesa)' },
  //       { value: 'uuid-cat-freelance', label: 'Freelance (Receita)' },
  //     ]);
  //   }
  // }, [isOpen]);

  // Carregar contas financeiras
  useEffect(() => {
    if (isOpen) {
      setIsLoadingFinancialAccounts(true);
      getFinancialAccountsForSelectAction()
        .then(response => {
          if (response.isSuccess && response.data) {
            setFinancialAccountOptions(response.data);
          } else {
            console.error("Failed to load financial accounts:", response.message);
            setFinancialAccountOptions([]); // Limpar em caso de erro
          }
        })
        .catch(error => {
          console.error("Error fetching financial accounts:", error);
          setFinancialAccountOptions([]);
        })
        .finally(() => {
          setIsLoadingFinancialAccounts(false);
        });
    }
  }, [isOpen]);

  // Carregar categorias de transação
  useEffect(() => {
    if (isOpen) {
      // Limpar category_id e opções quando o tipo mudar ou ao abrir, antes de carregar novas
      setValue('category_id', null); // Reseta o valor do campo no formulário
      setCategoryOptions([]);       // Limpa as opções no estado do componente
      
      // Só carrega se um tipo estiver selecionado
      if (selectedTransactionType) { 
        setIsLoadingCategories(true);
        console.log('[Modal:LoadCategories] useEffect disparado. isOpen:', isOpen, 'selectedTransactionType:', selectedTransactionType);
        getTransactionCategoriesForSelectAction({ type: selectedTransactionType })
          .then(response => {
            console.log('[Modal:LoadCategories] Resposta da Action:', response);
            if (response.isSuccess && response.data) {
              setCategoryOptions(response.data);
              console.log('[Modal:LoadCategories] Categorias definidas no estado:', response.data);
            } else {
              console.error("[Modal:LoadCategories] Falha ao carregar categorias:", response.message);
              // setCategoryOptions([]); // Já limpo acima
            }
          })
          .catch(error => {
            console.error("[Modal:LoadCategories] Erro ao buscar categorias:", error);
            // setCategoryOptions([]); // Já limpo acima
          })
          .finally(() => {
            setIsLoadingCategories(false);
          });
      } else {
        // Se nenhum tipo estiver selecionado, garantir que o loading esteja false e opções vazias
        setIsLoadingCategories(false); 
        // setCategoryOptions([]); // Já limpo acima
      }
    }
  }, [isOpen, selectedTransactionType, setValue]); // Adicionado setValue às dependências
  
  // Atualizar currency_id quando financial_account_id mudar
  const selectedFinancialAccount = watch('financial_account_id');
  useEffect(() => {
    if (selectedFinancialAccount) {
      const account = financialAccountOptions.find(acc => acc.value === selectedFinancialAccount);
      if (account) {
        setValue('currency_id', account.currency_id, { shouldValidate: true });
      }
    } else {
        setValue('currency_id', '', { shouldValidate: true });
    }
  }, [selectedFinancialAccount, financialAccountOptions, setValue]);

  // Efeito para resetar o formulário quando o modal é fechado ou os dados iniciais mudam
  useEffect(() => {
    if (isOpen) {
      // Lógica de reset original, antes da tentativa de usar mapInitialDataToFormData
      const defaultVals = {
        description: '',
        amount: 0,
        transaction_date: new Date(),
        type: undefined,
        status: undefined,
        financial_account_id: '',
        category_id: null,
        currency_id: '', // Será atualizado pelo useEffect que observa financial_account_id
        contact_id: null,
        notes: null,
        ...(initialData ? {
          ...initialData,
          amount: initialData.amount || 0,
          transaction_date: initialData.transaction_date ? new Date(initialData.transaction_date) : new Date(),
          // category_id já deve estar no formato correto (string ou null) em initialData se vier do TransactionManagementClient
        } : {}),
      };
      reset(defaultVals);
      // Se initialData e financial_account_id existem, e as opções de conta estão carregadas,
      // encontrar a moeda e setar currency_id. Este useEffect já existe separadamente e cuidará disso.

    } else {
      // Limpar erros de submissão ao fechar
      setSubmissionError(null);
      // Considere resetar para valores totalmente vazios se for o comportamento desejado ao fechar sem submeter
      // reset({ description: '', amount: 0, transaction_date: new Date(), type: undefined, status: undefined, financial_account_id: '', category_id: null, currency_id: '', contact_id: null, notes: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, reset]); // Removido financialAccountOptions daqui pois a lógica de currency_id está em outro useEffect

  const processSubmit = async (formData: ClientTransactionFormData) => {
    let dataForSubmission: any = { ...formData }; 

    // A data já deve ser um objeto Date do react-hook-form e do Calendar.
    // O Next.js irá serializá-lo e desserializá-lo de volta para Date na server action.
    // Portanto, a conversão para ISOString não é necessária aqui.

    // Manter a conversão de amount, pois é uma boa prática garantir que seja número
    if (typeof dataForSubmission.amount === 'string') {
        dataForSubmission.amount = parseFloat(dataForSubmission.amount);
    }

    console.log('[Modal:OnSubmit] Dados enviados para a action:', JSON.stringify(dataForSubmission, null, 2));
    setIsSubmitting(true);
    setSubmissionError(null);
    let response: ActionResponse<Transaction>;
    try {
      if (initialData?.id) {
        response = await updateTransactionAction(initialData.id, dataForSubmission);
      } else {
        response = await createTransactionAction(dataForSubmission);
      }
      if (response.isSuccess) {
        onSuccess();
        onClose();
      } else {
        setSubmissionError(response.message || tShared('errors.genericError'));
        if (response.errors) { console.error("Server validation errors:", response.errors); }
      }
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionError(tShared('errors.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // TODO: Filtrar categoryOptions com base em selectedTransactionType
  const filteredCategoryOptions = categoryOptions; // Placeholder para filtro

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? tModal('editTitle') : tModal('createTitle')}</DialogTitle>
          {/* <DialogDescription>{tModal('formDescription')}</DialogDescription> */}
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
          
          <div>
            <Label htmlFor="description">{tModal('descriptionLabel')}</Label>
            <Input id="description" {...register('description')} />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="amount">{tModal('amountLabel')}</Label>
            <Input id="amount" type="number" step="0.01" {...register('amount')} />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          <Controller
            name="transaction_date"
            control={control}
            render={({ field }) => (
              <div>
                <Label htmlFor="transaction_date" className="block mb-1">{tModal('dateLabel')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="transaction_date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? new Date(field.value).toLocaleDateString() : <span>{tModal({id: 'datePlaceholder', defaultMessage: 'Selecione uma data'})}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date: Date | undefined) => field.onChange(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.transaction_date && <p className="text-sm text-red-500 mt-1">{errors.transaction_date.message}</p>}
              </div>
            )}
          />

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div>
                <Label htmlFor="type">{tModal('typeLabel')}</Label>
                <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={initialData?.type || ''}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={tModal('typePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypeValues.map(typeVal => (
                      <SelectItem key={typeVal} value={typeVal}>
                        {tTransactionTypes(typeVal)} 
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>}
              </div>
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <div>
                <Label htmlFor="status">{tModal('statusLabel')}</Label>
                <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={initialData?.status || ''}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={tModal('statusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionStatusValues.map(statusVal => (
                      <SelectItem key={statusVal} value={statusVal}>
                        {tTransactionStatus(statusVal)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>}
              </div>
            )}
          />
          
          {/* Campo Conta Financeira */}
          <Controller
            name="financial_account_id"
            control={control}
            render={({ field }) => (
              <div>
                <Label htmlFor="financial_account_id">{tModal('financialAccountLabel')}</Label>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  defaultValue={initialData?.financial_account_id}
                  disabled={isLoadingFinancialAccounts}
                >
                  <SelectTrigger id="financial_account_id">
                    <SelectValue placeholder={
                      isLoadingFinancialAccounts 
                        ? tModal({id: 'loadingFinancialAccountsPlaceholder', defaultMessage: "Carregando contas..."}) 
                        : tModal({id: 'financialAccountPlaceholder', defaultMessage: "Selecione uma conta"})
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {financialAccountOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.financial_account_id && <p className="text-sm text-red-500 mt-1">{errors.financial_account_id.message}</p>}
              </div>
            )}
          />

          {/* Campo Moeda (será oculto ou apenas para display, valor vem da conta) */}
          {/* <Input type="hidden" {...register('currency_id')} /> */}
          {/* Ou, se quiser mostrar a moeda da conta selecionada: */}
          {watch('financial_account_id') && financialAccountOptions.find(acc => acc.value === watch('financial_account_id')) && (
            <div>
                <Label>{tModal({id: 'currencyDerivedLabel', defaultMessage: "Moeda (da conta)"})}</Label>
                <p className="text-sm p-2 border rounded-md bg-muted">
                    {financialAccountOptions.find(acc => acc.value === watch('financial_account_id'))?.currency_code}
                </p>
            </div>
          )}

          {/* Campo Categoria */}
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => {
              // Log para depurar o estado de `disabled`
              console.log('[Modal:CategorySelectRender] isLoadingCategories:', isLoadingCategories, 'selectedTransactionType:', selectedTransactionType, 'isDisabled:', isLoadingCategories || !selectedTransactionType);
              return (
              <div>
                <Label htmlFor="category_id">{tModal('categoryLabel')}</Label>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value === "" ? null : value);
                  }} 
                  value={field.value === null ? "" : (field.value || "")}
                  defaultValue={initialData?.category_id === null ? "" : (initialData?.category_id || "")}
                  disabled={isLoadingCategories || !selectedTransactionType} // Desabilitar se não houver tipo ou estiver carregando
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder={
                      isLoadingCategories 
                        ? tModal({id: 'loadingCategoriesPlaceholder', defaultMessage: "Carregando categorias..."}) 
                        : (!selectedTransactionType 
                            ? tModal({id: 'selectTransactionTypeFirstPlaceholder', defaultMessage: "Selecione um tipo de transação primeiro"})
                            : tModal({id: 'categoryPlaceholder', defaultMessage: "Selecione uma categoria (opcional)"})
                          )
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategoryOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && <p className="text-sm text-red-500 mt-1">{errors.category_id.message}</p>}
              </div>
              );
            }}
          />
          
          {/* TODO: Adicionar campo Contact (contact_id) como Select se necessário */}
          {/* TODO: Adicionar campo Notes (notes) como Textarea se necessário */}

          {submissionError && (
            <p className="text-sm text-red-500 mt-2 mb-2 text-center">{submissionError}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>{tShared('cancel')}</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tShared('submitting') : (initialData?.id ? tShared('saveChanges') : tShared('create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 