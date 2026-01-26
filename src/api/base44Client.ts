// src/api/base44Client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ID = string;
type SortSpec = string | null | undefined; // e.g. '-created_date'
type Filter<T> = Partial<Record<keyof T, any>>;

// IMPORTANT: These must be set in Vercel Project → Settings → Environment Variables
// (do NOT rely on uploading .env.local into Vercel)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly so production doesn't silently fall back to "nothing works"
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set these in Vercel env vars."
  );
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");

// Map Base44 exported entity names → real Postgres table names
// Update these if your actual table names differ.
const TABLES: Record<string, string> = {
  ActivityFeed: "activity_feed",
  Church: "churches",
  Course: "courses",
  CourseEnrollment: "course_enrollments",
  CourseSession: "course_sessions",
  Discussion: "discussions",
  ScriptureStudy: "scripture_studies",
  StudyGroup: "study_groups",
  StudyProgress: "study_progress",
  StudyResponse: "study_responses",
  UserProfile: "user_profiles",
  ChurchMember: "church_members",
};

function applySortToQuery<T>(
  q: ReturnType<SupabaseClient["from"]>,
  sort?: SortSpec
) {
  if (!sort) return q;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return (q as any).order(field, { ascending: !desc });
}

function applyFilterToQuery<T extends Record<string, any>>(
  q: any,
  criteria: Filter<T>
) {
  for (const [k, v] of Object.entries(criteria ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    q = q.eq(k, v);
  }
  return q;
}

class EntityApi<T extends Record<string, any>> {
  constructor(private entityName: string) {}

  private tableName() {
    return TABLES[this.entityName] ?? this.entityName;
  }

  async list(sort?: SortSpec): Promise<(T & { id: ID })[]> {
    const table = this.tableName();
    let q: any = supabase.from(table).select("*");
    q = applySortToQuery<T>(q, sort);

    const { data, error } = await q;
    if (error) throw new Error(`[${this.entityName}.list] ${error.message}`);
    return (data ?? []) as any;
  }

  async filter(
    criteria: Filter<T>,
    sort?: SortSpec,
    limit?: number
  ): Promise<(T & { id: ID })[]> {
    const table = this.tableName();
    let q: any = supabase.from(table).select("*");
    q = applyFilterToQuery<T>(q, criteria);
    q = applySortToQuery<T>(q, sort);
    if (typeof limit === "number") q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw new Error(`[${this.entityName}.filter] ${error.message}`);
    return (data ?? []) as any;
  }

  async create(data: T): Promise<T & { id: ID }> {
    const table = this.tableName();
    const { data: created, error } = await supabase
      .from(table)
      .insert(data as any)
      .select("*")
      .single();

    if (error) throw new Error(`[${this.entityName}.create] ${error.message}`);
    return created as any;
  }

  async update(id: ID, patch: Partial<T>): Promise<T & { id: ID }> {
    const table = this.tableName();
    const { data: updated, error } = await supabase
      .from(table)
      .update(patch as any)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(`[${this.entityName}.update] ${error.message}`);
    return updated as any;
  }

  async delete(id: ID): Promise<void> {
    const table = this.tableName();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw new Error(`[${this.entityName}.delete] ${error.message}`);
  }
}

// Minimal user shape used by pages
export type Base44User = {
  id?: string;
  email: string;
  full_name?: string;
};

export const base44 = {
  auth: {
    async me(): Promise<Base44User> {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw new Error(`[auth.me] ${error.message}`);
      const u = data.user;
      if (!u?.email) throw new Error("[auth.me] Not signed in");

      // Prefer metadata full_name if present
      const fullName =
        (u.user_metadata?.full_name as string | undefined) ||
        (u.user_metadata?.name as string | undefined);

      return { id: u.id, email: u.email, full_name: fullName };
    },

    redirectToLogin() {
      window.location.href = "/get-started";
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(`[auth.signOut] ${error.message}`);
    },
  },

  entities: {
    ActivityFeed: new EntityApi<any>("ActivityFeed"),
    Church: new EntityApi<any>("Church"),
    Course: new EntityApi<any>("Course"),
    CourseEnrollment: new EntityApi<any>("CourseEnrollment"),
    CourseSession: new EntityApi<any>("CourseSession"),
    Discussion: new EntityApi<any>("Discussion"),
    ScriptureStudy: new EntityApi<any>("ScriptureStudy"),
    StudyGroup: new EntityApi<any>("StudyGroup"),
    StudyProgress: new EntityApi<any>("StudyProgress"),
    StudyResponse: new EntityApi<any>("StudyResponse"),
    UserProfile: new EntityApi<any>("UserProfile"),
    ChurchMember: new EntityApi<any>("ChurchMember"),
  },

  // Expose raw client if you need it elsewhere
  supabase,
};
