"use client";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

export function ClientTestButton() {
  const t = useTranslations('ClientTestButton');

  return (
    <Button variant="secondary" onClick={() => alert(t('alertMessage'))}>
      {t('testButtonText')}
    </Button>
  );
} 