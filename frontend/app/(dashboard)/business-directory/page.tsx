'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessDirectoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/directory');
  }, [router]);

  return null;
}
