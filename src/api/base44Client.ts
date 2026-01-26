// src/api/base44Client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ID = string;
type SortSpec = string | null | undefined; // e.g. 'created_date' or '-created_date'
type FilterShape = Record<string, any>;

// Vercel must have these set as Environment Variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env.");
}

// ✅ Exported for pages that need direct storage access (uploads)
export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");

function applySort(q: any, sort?: SortSpec) {
  if (!sort) return q;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return q.order(field, { ascending: !desc });
}

function applyFilters(q: any, where?: FilterShape) {
  if (!where) return q;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (v === null) q = q.is(k, null);
    else if (Array.isArray(v)) q = q.in(k, v);
    else q = q.eq(k, v);
  }
  return q;
}

class EntityApi<T extends Record<string, any>> {
  constructor(private table: string, private alias?: Record<string, string>) {}

  private mapWhere(where?: FilterShape) {
    if (!where || !this.alias) return where ?? {};
    const out: FilterShape = { ...where };
    for (const [from, to] of Object.entries(this.alias)) {
      if (Object.prototype.hasOwnProperty.call(out, from)) {
        out[to] = out[from];
        delete out[from];
      }
    }
    return out;
  }

  async filter(where: FilterShape = {}, sort?: SortSpec, limit?: number): Promise<(T & { id: ID })[]> {
    const mapped = this.mapWhere(where);
    let q: any = supabase.from(this.table).select("*");
    q = applyFilters(q, mapped);
    q = applySort(q, sort);
    if (typeof limit === "number") q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any;
  }

  async list(sort?: SortSpec): Promise<(T & { id: ID })[]> {
    let q: any = supabase.from(this.table).select("*");
    q = applySort(q, sort);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any;
  }

  async create(payload: Partial<T>): Promise<T & { id: ID }> {
    const { data, error } = await supabase.from(this.table).insert(payload as any).select("*").single();
    if (error) throw error;
    return data as any;
  }

  async update(id: ID, payload: Partial<T>): Promise<T & { id: ID }> {
    const { data, error } = await supabase
      .from(this.table)
      .update(payload as any)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as any;
  }

  async delete(id: ID): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq("id", id);
    if (error) throw error;
  }
}

export type Base44User = {
  id: string;
  email: string | null;
  full_name?: string | null;
  role?: string | null;
};

export const base44 = {
  supabase,

  auth: {
    async me(): Promise<Base44User> {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const u = data.user;
      const full_name =
        (u.user_metadata as any)?.full_name ??
        (u.user_metadata as any)?.name ??
        (u.user_metadata as any)?.display_name ??
        null;
      const role = (u.user_metadata as any)?.role ?? null;

      return {
        id: u.id,
        email: u.email ?? null,
        full_name,
        role,
      };
    },
  },

  entities: {
    // ✅ IMPORTANT: map to your actual tables
    Church: new EntityApi<any>("churches"),
    ChurchMember: new EntityApi<any>("church_members"),

    Course: new EntityApi<any>("courses"),
    CourseSession: new EntityApi<any>("course_sessions"),
    CourseEnrollment: new EntityApi<any>("course_enrollments"),

    StudyGroup: new EntityApi<any>("groups"),
    ScriptureStudy: new EntityApi<any>("studies"),

    // ✅ Your real profile table is public.profiles
    // ✅ compatibility: UI still uses user_email in places → map to email
    UserProfile: new EntityApi<any>("profiles", { user_email: "email" }),
  },
};
