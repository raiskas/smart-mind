'use client';

import { logServiceKey } from '@/app/actions/testEnvActions';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function TestEnvButton() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await logServiceKey();
      setResult(res);
      console.log('Resultado da Test Action no Cliente:', res);
    } catch (error) {
      console.error('Erro ao chamar test action:', error);
      setResult({ error: 'Falha ao chamar a action' });
    }
    setIsLoading(false);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px' }}>
      <h3>Teste de Variável de Ambiente (SUPABASE_SERVICE_ROLE_KEY)</h3>
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Testando...' : 'Testar Chave de Serviço'}
      </Button>
      {result && (
        <pre style={{ marginTop: '10px', padding: '10px', background: '#f0f0f0' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      <p style={{ fontSize: '0.8em', marginTop: '10px' }}>
        Verifique o console do <strong>servidor</strong> Next.js para logs detalhados após clicar.
      </p>
    </div>
  );
} 