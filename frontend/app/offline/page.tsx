'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Offline icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-charcoal mb-3">You&apos;re Offline</h1>
        <p className="text-gray-600 mb-6">
          It looks like you&apos;ve lost your internet connection. Please check your connection and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors font-medium"
        >
          Try Again
        </button>

        <p className="mt-6 text-sm text-gray-400">Mosque CRM</p>
      </div>
    </div>
  );
}
