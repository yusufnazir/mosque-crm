'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page — middleware handles redirect based on session_token cookie.
 * This is just a fallback loading spinner in case middleware doesn't redirect.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Middleware should have already redirected.
    // This is a safety fallback — try dashboard, and if not authenticated
    // the middleware/AuthContext will redirect to login.
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
