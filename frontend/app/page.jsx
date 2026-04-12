"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    // If authenticated, dashboard renders; if not, dashboard layout redirects to /login
    router.replace('/dashboard');
  }, [router]);
  return null;
}
