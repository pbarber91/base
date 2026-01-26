/*
  Base44 compatibility client backed by Supabase.

  Implements the subset used by your pages:
    - base44.auth.me()
    - base44.auth.redirectToLogin()
    - base44.entities.<Entity>.list()/filter()/create()/update()/delete()

  IMPORTANT:
  - Data is persisted in Supabase (so Vercel + localhost match).
  - UserProfile has an optional localStorage cache for snappy UI.
*/

import { supabase } from "@/lib/supabaseClient";

type ID = string;
type SortSpec = string | null | undefined; // e.g. '-created_date' or 'order'
type Filter<T> = Partial<Record<keyof T, any>>;

export type Base44User = {
  email: string;
  full_name?: string;
};

function parseSort(sort?: SortSpec): { column: string; ascending: boolean } | null {
  if (!sort) return null;
  const s = String(sort);
  if (!s.trim()) return null;
  const desc = s.startsWith("-");
  return { column: desc ? s.slice(1) : s, ascending: !desc };
}

function storageKey(entityName: string) {
  return `base44_port_${entityName}`;
}

function safeReadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteCache(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function safeClearCache(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

class SupabaseEntityApi<T extends Record<string, any>> {
  constructor(
    private tableName: string,
    private options?: {
      // When true, cache the most recent results under base44_port_<TableName>
      cache?: boolean;
      // If provided, only cache when filtering by this field (e.g. user_email)
      cacheKeyField?: string;
    }
  ) {}

  private applyCriteria(q: any, criteria?: Filter<T>) {
    if (!criteria) return q;

    for (const [k, v] of Object.entries(criteria)) {
      if (v === undefined || v === null || v === "") continue;

      // Basic behavior: equality for primitives
      // If an array is passed as filter value, attempt "in"
      if (Array.isArray(v)) {
        q = q.in(k, v);
      } else {
        q = q.eq(k, v);
      }
    }
    return q;
  }

  async list(sort?: SortSpec): Promise<(T & { id: ID })[]> {
    const s = parseSort(sort);
    let q = supabase.from(this.tableName).select("*");

    if (s) q = q.order(s.column, { ascending: s.ascending });

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any;
  }

  async filter(criteria: Filter<T>, sort?: SortSpec, limit?: number): Promise<(T & { id: ID })[]> {
    // Optional fast-path: return cached profile immediately if it matches the requested user_email,
    // but still re-fetch from Supabase and overwrite cache before returning.
    const cacheEnabled = !!this.options?.cache;
    const cacheField = this.options?.cacheKeyField;
    const cacheKey = storageKey(this.tableName);

    if (cacheEnabled && cacheField && criteria && Object.prototype.hasOwnProperty.call(criteria, cacheField)) {
      const cached = safeReadCache<any[]>(cacheKey);
      // only use cached if it actually matches the criteria field
      const want = (criteria as any)[cacheField];
      if (cached && Array.isArray(cached) && cached.length > 0) {
        const match = cached.filter((r) => r?.[cacheField] === want);
        if (match.length > 0) {
          // We still fetch fresh below; but returning cached first would require background work.
          // Instead: we proceed to fetch and then update cache; this keeps correctness.
          // (If you ever want "instant cached render", we should implement that at the component layer.)
        }
      }
    }

    const s = parseSort(sort);
    let q = supabase.from(this.tableName).select("*");
    q = this.applyCriteria(q, criteria);
    if (s) q = q.order(s.column, { ascending: s.ascending });
    if (typeof limit === "number") q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as any;

    // Cache results if configured (UserProfile)
    if (cacheEnabled) {
      // If cacheKeyField is set, only cache when that field exists in criteria
      if (!cacheField || (criteria && Object.prototype.hasOwnProperty.call(criteria, cacheField))) {
        safeWriteCache(cacheKey, rows);
      }
    }

    return rows;
  }

  async create(data: T): Promise<T & { id: ID }> {
    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(data as any)
      .select("*")
      .single();

    if (error) throw error;

    // cache refresh
    if (this.options?.cache) {
      safeWriteCache(storageKey(this.tableName), [created]);
    }

    return created as any;
  }

  async update(id: ID, patch: Partial<T>): Promise<T & { id: ID }> {
    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(patch as any)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    // cache refresh
    if (this.options?.cache) {
      safeWriteCache(storageKey(this.tableName), [updated]);
    }

    return updated as any;
  }

  async delete(id: ID): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq("id", id);
    if (error) throw error;

    // cache clear (best effort)
    if (this.options?.cache) {
      safeClearCache(storageKey(this.tableName));
    }
  }
}

export const base44 = {
  auth: {
    async me(): Promise<Base44User> {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const u = data.user;
      if (!u?.email) throw new Error("Not signed in");

      // Prefer metadata display name if present; otherwise fall back.
      const full_name =
        (u.user_metadata as any)?.full_name ||
        (u.user_metadata as any)?.name ||
        (u.user_metadata as any)?.display_name ||
        undefined;

      return { email: u.email, full_name };
    },

    redirectToLogin() {
      window.location.href = "/get-started";
    },

    async signOut() {
      await supabase.auth.signOut();
      // clear cached profile to avoid stale header
      safeClearCache(storageKey("UserProfile"));
    },
  },

  entities: {
    ActivityFeed: new SupabaseEntityApi<any>("ActivityFeed"),
    Church: new SupabaseEntityApi<any>("Church"),
    Course: new SupabaseEntityApi<any>("Course"),
    CourseEnrollment: new SupabaseEntityApi<any>("CourseEnrollment"),
    CourseSession: new SupabaseEntityApi<any>("CourseSession"),
    Discussion: new SupabaseEntityApi<any>("Discussion"),
    ScriptureStudy: new SupabaseEntityApi<any>("ScriptureStudy"),
    StudyGroup: new SupabaseEntityApi<any>("StudyGroup"),
    StudyProgress: new SupabaseEntityApi<any>("StudyProgress"),
    StudyResponse: new SupabaseEntityApi<any>("StudyResponse"),

    // Cache profile so header/profile screens can be snappy, but DB remains source of truth.
    UserProfile: new SupabaseEntityApi<any>("UserProfile", { cache: true, cacheKeyField: "user_email" }),
    Group: new SupabaseEntityApi<any>("Group"), // if your code references base44.entities.Group
  },
};
