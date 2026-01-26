import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type OrderBy = string | null | undefined;

type FilterShape = Record<string, any>;

function assertEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const supabaseUrl = assertEnv("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = assertEnv(
  "VITE_SUPABASE_ANON_KEY",
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Base44User = {
  id: string;
  email: string | null;
  full_name?: string | null;
};

class SupabaseEntityApi<T extends Record<string, any>> {
  constructor(private client: SupabaseClient, private table: string) {}

  async filter(where: FilterShape = {}, orderBy?: OrderBy, limit?: number): Promise<T[]> {
    let q = this.client.from(this.table).select("*");

    for (const [k, v] of Object.entries(where || {})) {
      if (v === undefined) continue;
      if (v === null) q = q.is(k, null);
      else if (Array.isArray(v)) q = q.in(k, v);
      else q = q.eq(k, v);
    }

    if (orderBy) q = q.order(orderBy as string, { ascending: true });
    if (limit && limit > 0) q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  }

  async create(payload: Partial<T>): Promise<T> {
    const { data, error } = await this.client.from(this.table).insert(payload).select("*").single();
    if (error) throw error;
    return data as T;
  }

  async update(id: string, payload: Partial<T>): Promise<T> {
    const { data, error } = await this.client.from(this.table).update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    return data as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq("id", id);
    if (error) throw error;
  }
}

export const base44 = {
  supabase,

  auth: {
    async me(): Promise<Base44User> {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const u = data.user;
      return {
        id: u.id,
        email: u.email ?? null,
        full_name:
          (u.user_metadata as any)?.full_name ??
          (u.user_metadata as any)?.name ??
          (u.user_metadata as any)?.display_name ??
          null,
      };
    },
  },

  entities: {
    // ✅ match your real public tables
    Church: new SupabaseEntityApi<any>(supabase, "churches"),
    Course: new SupabaseEntityApi<any>(supabase, "courses"),
    ScriptureStudy: new SupabaseEntityApi<any>(supabase, "studies"),
    StudyGroup: new SupabaseEntityApi<any>(supabase, "groups"),
    UserProfile: new SupabaseEntityApi<any>(supabase, "profiles"),
    ChurchMember: new SupabaseEntityApi<any>(supabase, "church_members"),
    GroupMember: new SupabaseEntityApi<any>(supabase, "group_members"),
  },
};
