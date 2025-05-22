'use server';

export async function logServiceKey() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não encontrada", keyStatus: "Não Definida" };
  } else {
    return { success: true, keyStatus: "Definida", firstChars: serviceKey.substring(0, 5) };
  }
} 