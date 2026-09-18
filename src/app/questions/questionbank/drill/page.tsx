'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionBankDrillRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/questions/questionbank/mistakes');
  }, [router]);

  return null;
}
