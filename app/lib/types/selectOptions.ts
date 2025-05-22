export interface SelectOption { 
  value: string; 
  label: string; 
}

export interface FinancialAccountOption extends SelectOption { 
  currency_code?: string | null; 
}

export interface CategoryOption extends SelectOption {}

export interface ContactOption extends SelectOption {}

export interface CurrencyOption extends SelectOption {} 