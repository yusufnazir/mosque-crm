'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/billing?tab=subscription'); }, [router]);
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
    </div>
  );
}
