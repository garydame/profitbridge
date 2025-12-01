'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DollarSign, ArrowUp, TrendingUp } from 'lucide-react';

interface ProfileData {
  full_name: string;
  balance: number;
  total_investments: number;
  earnings: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile + investments
  const fetchProfileData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, balance, earnings')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch investments
      const { data: investments } = await supabase
        .from('investments')
        .select('amount')
        .eq('user_id', userId);

      const total_investments = investments?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      setProfile({
        full_name: profileData.full_name,
        balance: Number(profileData.balance),
        earnings: Number(profileData.earnings),
        total_investments,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup realtime updates
  useEffect(() => {
    fetchProfileData();

    let cleanupFn: (() => void) | null = null;

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (!userId) return;

      // Realtime subscription
      const channel = supabase
        .channel(`public:investments:user_id=eq.${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${userId}` },
          () => fetchProfileData()
        )
        .subscribe();

      cleanupFn = () => supabase.removeChannel(channel);
    });

    return () => {
      cleanupFn?.();
    };
  }, [fetchProfileData]);

  if (loading) return <p className="text-center mt-20">Loading...</p>;
  if (!profile) return <p className="text-center mt-20 text-red-600">Failed to load user data.</p>;

  const cards = [
    { title: 'Account Balance', value: profile.balance, icon: <DollarSign size={24} />, color: 'green' },
    { title: 'Total Investments', value: profile.total_investments, icon: <ArrowUp size={24} />, color: 'blue' },
    { title: 'Earnings', value: profile.earnings, icon: <TrendingUp size={24} />, color: 'purple' },
  ];

  const getColorClass = (color: string) => ({
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }[color] || 'bg-gray-100 text-gray-700');

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">Welcome, {profile.full_name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`flex items-center justify-between p-5 rounded-lg shadow ${getColorClass(card.color)}`}
          >
            <div>
              <p className="text-sm font-medium">{card.title}</p>
              <p className="mt-1 text-2xl font-semibold">${Number(card.value).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-white/30">{card.icon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
