'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-600">500</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-3 text-gray-600">We could not load this page right now.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </main>
  );
}
