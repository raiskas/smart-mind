'use client'

import { useRouter } from 'next/navigation'
// import { createClient } from '../lib/supabase/client' // Cliente do browser - CAMINHO RELATIVO
import { createClient } from '@/lib/supabase/client' // Cliente do browser - USANDO ALIAS
import { Button } from '@/components/ui/button' // Nosso botão shadcn
import { useTranslations } from 'next-intl'

export function ClientLogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('ClientLogoutButton')

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      // O listener onAuthStateChange em LoginPage ou o middleware devem cuidar do redirecionamento.
      // Mas podemos forçar um refresh para garantir que o estado do servidor seja limpo.
      router.push('/login') // Redireciona para o login após o logout
      router.refresh()
    } else {
      console.error('Error logging out:', error)
      // Adicionar feedback para o usuário aqui, se desejado
    }
  }

  return (
    <Button onClick={handleLogout} variant="outline">
      {t('logoutButtonText')}
    </Button>
  )
} 