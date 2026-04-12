"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 min — data stays fresh, no refetch
        gcTime: 10 * 60 * 1000,         // 10 min garbage collection
        retry: 1,
        refetchOnWindowFocus: false,    // prevents re-fetch on tab switch
        refetchOnReconnect: false,
      }
    }
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background:"white",
            color:"#2A2A2A",
            borderLeft:"4px solid #C8871A",
            borderRadius:"8px",
            boxShadow:"0 4px 12px rgba(0,0,0,0.1)"
          },
          success: {
            iconTheme:{primary:"#22C55E",secondary:"white"}
          },
          error: {
            iconTheme:{primary:"#EF4444",secondary:"white"}
          }
        }}
      />
      {children}
    </QueryClientProvider>
  );
}
