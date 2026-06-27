import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '';
    const [oauthType] = state.split(':');

    if (code && window.opener) {
      const msgType = oauthType === 'gdrive' ? 'GDRIVE_AUTH_CODE' : 'GMAIL_AUTH_CODE';
      // Post the code back to the parent window
      window.opener.postMessage(
        {
          type: msgType,
          code: code,
        },
        window.location.origin
      );
      // Close the popup window
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <Loader2 className="animate-spin text-[#111111] mb-4" size={32} />
      <h2 className="text-lg font-bold text-gray-900 mb-1">Connecting to Google...</h2>
      <p className="text-sm text-gray-500">Please do not close this window. We are linking your account.</p>
    </div>
  );
}
