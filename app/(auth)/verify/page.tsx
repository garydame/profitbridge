'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState('Verifying...');

  // Redirect user based on role
  const checkUserRole = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  // Automatically check session after verification
  const tryRedirectIfLoggedIn = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (user) await checkUserRole(user.id);
  };

  useEffect(() => {
    const token = searchParams.get('token');
    const emailFromQuery = searchParams.get('email');

    if (!token) {
      setStatus('Invalid verification link');
      return;
    }

    const verify = async () => {
      let email = emailFromQuery;

      // If email not in URL, try to get from active session
      if (!email) {
        const { data: sessionData } = await supabase.auth.getSession();
        email = sessionData.session?.user?.email ?? null;
      }

      if (!email) {
        setStatus('Missing email for verification');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        type: 'signup',
        token,
        email
      });

      if (error) {
        console.error(error);
        setStatus('Verification failed');
        return;
      }

      setStatus('Email successfully verified! Redirecting...');
      await tryRedirectIfLoggedIn();
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded-xl shadow text-center">
        <h2 className="text-xl font-semibold text-primary">{status}</h2>
      </div>
    </div>
  );
}
