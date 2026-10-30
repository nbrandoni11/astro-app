import { createClient } from '@/lib/supabase-server';

export async function currentProfile() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: profile } = await client.from('users').select('*').eq('auth_user_id', user.id).single();
  return profile;
}
