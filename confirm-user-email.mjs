import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env.local (ou similar)
dotenv.config({ path: '.env.local' }); 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userIdToConfirm = 'fa773532-63bc-460e-ab5d-873ee86a50d0'; // ID do usuário

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Supabase URL or Service Role Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your .env.local file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmEmail() {
  console.log(`Attempting to confirm email for user ID: ${userIdToConfirm}...`);
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToConfirm,
    { email_confirm: true }
  );

  if (error) {
    console.error(`Error confirming email for user ${userIdToConfirm}:`, error.message);
    if (error.stack) {
        console.error("Stack:", error.stack);
    }
    return;
  }

  if (data && data.user) {
    if (data.user.email_confirmed_at) {
      console.log(`Successfully confirmed email for user ${userIdToConfirm}.`);
      console.log(`Email confirmed at: ${data.user.email_confirmed_at}`);
    } else {
      console.warn(`Update call succeeded for user ${userIdToConfirm}, but email_confirmed_at is still null in the response. Please verify in Supabase dashboard.`);
    }
    // console.log('Full user data after update:', data.user);
  } else {
    console.warn('No user data returned in the success response, but no error was thrown. Please verify in Supabase dashboard.');
  }
}

confirmEmail(); 