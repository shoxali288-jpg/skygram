import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured');
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target: any, prop: string | symbol) {
    const c = getClient();
    const value = (c as any)[prop];
    if (typeof value === 'function') {
      return (...args: unknown[]) => value.apply(c, args);
    }
    return value;
  },
});
