'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;                     // <-- REQUIRED for notifications & queries
  full_name: string;
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  earnings: number;
  pending_withdrawals: number;
}

export function useUserData() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async () => {
      setLoading(true);

      try {
        // Get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;

        // Not logged in
        if (!session?.user) {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
          return;
        }

        const currentUser = session.user;
        if (mounted) setUser(currentUser);

        // Fetch profile from DB
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            balance,
            total_deposits,
            total_withdrawals,
            earnings
          `)
          .eq('id', currentUser.id)
          .single();

        if (profileError) throw profileError;

        // Fetch pending withdrawals
        const { data: pendingWithdrawals, error: pendingError } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('user_id', currentUser.id)
          .eq('status', 'processing');

        if (pendingError) throw pendingError;

        const pending_withdrawals =
          pendingWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

        if (mounted) {
          setProfile({
            id: profileData.id,
            full_name: profileData.full_name,
            balance: Number(profileData.balance),
            total_deposits: Number(profileData.total_deposits),
            total_withdrawals: Number(profileData.total_withdrawals),
            earnings: Number(profileData.earnings),
            pending_withdrawals,
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUserData();

    // Re-fetch on auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
