import { useState } from 'react';

// Test component to trigger errors for Sentry testing
export default function ErrorTestButton() {
  const [throwError, setThrowError] = useState(false);

  if (throwError) {
    throw new Error('Test error for Sentry tracking');
  }

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <button
      onClick={() => setThrowError(true)}
      className="fixed bottom-4 right-4 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 shadow-lg z-50"
      title="Test error boundary"
    >
      🐛 Test Error
    </button>
  );
}