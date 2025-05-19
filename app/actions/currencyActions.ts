'use server';

import { getServiceRoleClient } from '@/lib/supabase/service';
// import { Database } from '@/types/database.types'; // TODO: Generate and uncomment this for strong types

export async function getCurrenciesAction() {
  const supabase = getServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('currencies')
      .select('id, code, name, symbol') // Select necessary fields
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching currencies:', error);
      return { error: `Database error: ${error.message}`, currencies: [] };
    }
    return { currencies: data || [] };
  } catch (e: any) {
    console.error('Unexpected error in getCurrenciesAction:', e);
    return { error: `An unexpected error occurred: ${e.message}`, currencies: [] };
  }
} 