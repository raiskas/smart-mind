import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

// Esta página apenas redireciona para a rota com o locale padrão.
// O middleware deve capturar isso primeiro e redirecionar corretamente.
export default function RootPage() {
  redirect(`/${defaultLocale}`);
} 