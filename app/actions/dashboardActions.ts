'use server';

import { getServiceRoleClient } from '@/lib/supabase/service';
import { getCurrentUserContext } from '@/lib/auth/actions';
import type { ActionResponse } from '@/lib/types/actions';
// import { Database } from '@/types/supabase';
import type { UserContext } from '@/lib/types/actions';

// TODO: Define interfaces for dashboard data if they become complex

// Example type for summary data (can be expanded)
export interface DashboardSummaryData {
  totalPayables: number;
  totalReceivables: number;
  consolidatedBalance: number;
  monthlyTransactionsCount: number;
  // Add more fields as needed, e.g., currencyCode
}

// Example type for an upcoming item (can be expanded)
export interface UpcomingItem {
  id: string;
  description: string;
  dueDate: string; // or Date
  amount: number;
  currencyCode: string;
  // type: 'payable' | 'receivable'; // Could be useful
}

export interface UpcomingItemsData {
  upcomingPayables: UpcomingItem[];
  upcomingReceivables: UpcomingItem[];
}

/**
 * Fetches summary data for the admin dashboard.
 * This includes total payables, total receivables, consolidated balance,
 * and a count of transactions in the current calendar month.
 */
export async function getDashboardSummaryAction(): Promise<ActionResponse<DashboardSummaryData>> {
  try {
    const userContext: UserContext = await getCurrentUserContext();
    if (!userContext.companyId) {
      return { 
        isSuccess: false, 
        isError: true,
        message: 'User is not associated with a company.'
      };
    }
    const companyId = userContext.companyId;
    const supabase = getServiceRoleClient();

    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // 1. Total Payables (sum of unpaid/pending 'expense' transactions)
    // Consider 'pending', 'overdue' as payables. Exclude 'paid', 'cancelled'.
    const { data: payablesData, error: payablesError } = await supabase
      .from('transactions')
      .select('amount, currency_id, currencies (code)') // Assuming a 'currencies' table linked by currency_id
      .eq('company_id', companyId)
      .eq('type', 'expense')
      .not('status', 'in', '("paid", "cancelled")'); // Corrected string quoting for IN clause values

    if (payablesError) {
      console.error('Error fetching total payables:', payablesError);
      return { isSuccess: false, isError: true, message: `Error fetching payables: ${payablesError.message}` };
    }
    // TODO: Handle multi-currency summation. For now, summing amounts directly.
    const totalPayables = payablesData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // 2. Total Receivables (sum of unreceived/pending 'income' transactions)
    // Consider 'pending', 'overdue', 'scheduled' as receivables. Exclude 'received', 'cancelled'.
    const { data: receivablesData, error: receivablesError } = await supabase
      .from('transactions')
      .select('amount, currency_id, currencies (code)')
      .eq('company_id', companyId)
      .eq('type', 'income')
      .not('status', 'in', '("received", "cancelled")'); // Corrected string quoting for IN clause values

    if (receivablesError) {
      console.error('Error fetching total receivables:', receivablesError);
      return { isSuccess: false, isError: true, message: `Error fetching receivables: ${receivablesError.message}` };
    }
    // TODO: Handle multi-currency summation.
    const totalReceivables = receivablesData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    // 3. Monthly Transactions Count (count of all transactions in the current calendar month)
    const { count: monthlyTransactionsCount, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('transaction_date', firstDayOfMonth)
      .lte('transaction_date', lastDayOfMonth);

    if (countError) {
      console.error('Error fetching monthly transactions count:', countError);
      return { isSuccess: false, isError: true, message: `Error fetching transactions count: ${countError.message}` };
    }

    const summaryData: DashboardSummaryData = {
      totalPayables,
      totalReceivables,
      consolidatedBalance: totalReceivables - totalPayables, // Simple calculation
      monthlyTransactionsCount: monthlyTransactionsCount || 0,
    };

    return { isSuccess: true, isError: false, data: summaryData };

  } catch (error) {
    console.error('Error in getDashboardSummaryAction:', error);
    return { 
      isSuccess: false, 
      isError: true,
      message: 'Failed to fetch dashboard summary.', 
    };
  }
}

/**
 * Fetches upcoming payables and receivables for the admin dashboard.
 * Typically, these are items due in the near future.
 */
export async function getUpcomingItemsAction(limit: number = 5): Promise<ActionResponse<UpcomingItemsData>> {
  try {
    const userContext: UserContext = await getCurrentUserContext();
    if (!userContext.companyId) { 
      return { 
        isSuccess: false, 
        isError: true, 
        message: 'User is not associated with a company.' 
      };
    }
    const companyId = userContext.companyId;
    const supabase = getServiceRoleClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format for due_date comparison

    // 1. Upcoming Payables
    const { data: upcomingPayablesData, error: upcomingPayablesError } = await supabase
      .from('transactions')
      .select('id, description, due_date, amount, currency_id, currencies (code)')
      .eq('company_id', companyId)
      .eq('type', 'expense')
      .not('status', 'in', '("paid", "cancelled")')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (upcomingPayablesError) {
      console.error('Error fetching upcoming payables:', upcomingPayablesError);
      return { isSuccess: false, isError: true, message: `Error fetching upcoming payables: ${upcomingPayablesError.message}` };
    }

    const upcomingPayables: UpcomingItem[] = upcomingPayablesData?.map(t => ({
      id: t.id,
      description: t.description || 'N/A',
      dueDate: t.due_date || new Date().toISOString(), // Fallback, should ideally always exist for payables
      amount: t.amount || 0,
      currencyCode: t.currencies && t.currencies.length > 0 ? t.currencies[0]?.code : 'N/A',
    })) || [];

    // 2. Upcoming Receivables
    const { data: upcomingReceivablesData, error: upcomingReceivablesError } = await supabase
      .from('transactions')
      .select('id, description, due_date, amount, currency_id, currencies (code)')
      .eq('company_id', companyId)
      .eq('type', 'income')
      .not('status', 'in', '("received", "cancelled")')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (upcomingReceivablesError) {
      console.error('Error fetching upcoming receivables:', upcomingReceivablesError);
      return { isSuccess: false, isError: true, message: `Error fetching upcoming receivables: ${upcomingReceivablesError.message}` };
    }

    const upcomingReceivables: UpcomingItem[] = upcomingReceivablesData?.map(t => ({
      id: t.id,
      description: t.description || 'N/A',
      dueDate: t.due_date || new Date().toISOString(), // Fallback
      amount: t.amount || 0,
      currencyCode: t.currencies && t.currencies.length > 0 ? t.currencies[0]?.code : 'N/A',
    })) || [];

    return { isSuccess: true, isError: false, data: { upcomingPayables, upcomingReceivables } };

  } catch (error) {
    console.error('Error in getUpcomingItemsAction:', error);
    return { 
      isSuccess: false, 
      isError: true, 
      message: 'Failed to fetch upcoming items.', 
    };
  }
} 