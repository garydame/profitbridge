'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';

interface Profile {
  full_name: string;
  username: string;
  email: string;
  btc_address: string | null;
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, email, btc_address')
        .eq('id', userId)
        .single();

      if (error || !data) {
        toast.error('Failed to load profile');
        console.error(error);
        setProfile(null);
      } else {
        setProfile(data as Profile); // Type assertion
      }
    } catch (err) {
      console.error(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => prev ? { ...prev, [name]: value } : prev);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username,
          btc_address: profile.btc_address,
        })
        .eq('id', userId);

      if (error) {
        toast.error('Failed to update profile');
        console.error(error);
      } else {
        toast.success('Profile updated successfully');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="text-center py-10 text-gray-600">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Profile Settings</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {['full_name', 'username', 'btc_address'].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field === 'btc_address' ? 'Bitcoin Wallet Address' : field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            <input
              type="text"
              name={field}
              value={profile[field as keyof Profile] || ''}
              onChange={handleChange}
              className="w-full border rounded-md p-3 focus:ring-2 focus:ring-red-600 focus:outline-none"
              required={field !== 'btc_address'}
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (read-only)</label>
          <input
            type="email"
            value={profile.email}
            readOnly
            className="w-full border rounded-md p-3 bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3 rounded-md text-white font-semibold transition-all ${
            saving ? 'bg-red-400 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800'
          }`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
