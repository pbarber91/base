/*
  Base44 compatibility client backed by Supabase.

  Implements the subset used by your pages:
    - base44.auth.me()
    - base44.auth.redirectToLogin()
    - base44.entities.<Entity>.list()/filter()/create()/update()/delete()

  Notes:
  - Supabase tables are snake_case + plural (e.g. churches, profiles, groups, courses, studies).
  - We keep Base44-style entity names (Church, UserProfile, etc.) but map them to real table names.
  - We also keep backward-compatible field aliases used throughout the UI:
      user_email <-> email
      created_date <-> created_at
      updated_date <-> updated_at
*/

import { supabase } from "@/lib/supabaseClient";

type ID = string;
type SortSpec = string | null | undefined;
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

type EntityConfig = {
  table: string;

  // Columns we allow to pass through to Supabase for insert/update.
  // Anything else is stripped so old UI fields don't break writes.
  allowed?: string[];

  // Field aliases for backwards compatibility (criteria + payload).
  // Example: { user_email: "email" } means:
  //  - filter({ user_email: ... }) becomes eq("email", ...)
  //  - create({ user_email: ... }) writes { email: ... }
  alias?: Record<string, string>;

  // When true, cache the most recent results under base44_port_<EntityKey>
  cache?: boolean;

  // If provided, only cache when filtering by this field (after aliasing)
  cacheKeyField?: string;
};

function applyAliases(obj: Record<string, any>, alias?: Record<string, string>) {
  if (!alias) return obj;
  const out: Record<string, any> = { ...obj };
  for (const [from, to] of Object.entries(alias)) {
    if (Object.prototype.hasOwnProperty.call(out, from)) {
      // If both exist, prefer the real column (to)
      if (!Object.prototype.hasOwnProperty.call(out, to)) {
        out[to] = out[from];
      }
      delete out[from];
    }
  }
  return out;
}

function stripUnknown(obj: Record<string, any>, allowed?: string[]) {
  if (!allowed) return obj;
  const out: Record<string, any> = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function addCompatAliases(row: any) {
  if (!row || typeof row !== "object") return row;

  // created_date / updated_date aliases (Base44-ish)
  if (row.created_at && row.created_date === undefined) row.created_date = row.created_at;
  if (row.updated_at && row.updated_date === undefined) row.updated_date = row.updated_at;

  // user_email alias for profiles (if email exists)
  if (row.email && row.user_email === undefined) row.user_email = row.email;

  return row;
}

class SupabaseEntityApi<T extends Record<string, any>> {
  constructor(private entityKey: string, private cfg: EntityConfig) {}

  private applyCriteria(q: any, criteria?: Filter<T>) {
    if (!criteria) return q;

    const raw = criteria as any;
    const aliased = applyAliases(raw, this.cfg.alias);

    for (const [k, v] of Object.entries(aliased)) {
      if (v === undefined || v === null || v === "") continue;

      if (Array.isArray(v)) {
        q = q.in(k, v);
      } else {
        q = q.eq(k, v);
      }
    }
    return q;
  }

  private maybeCache(criteria?: any, rows?: any[]) {
    if (!this.cfg.cache) return;

    // If cacheKeyField is set, only cache when that field exists in criteria
    const cacheKey = storageKey(this.entityKey);
    if (this.cfg.cacheKeyField) {
      const aliasedCriteria = criteria ? applyAliases(criteria, this.cfg.alias) : null;
      if (!aliasedCriteria || !Object.prototype.hasOwnProperty.call(aliasedCriteria, this.cfg.cacheKeyField)) return;
    }

    safeWriteCache(cacheKey, rows ?? []);
  }

  async list(sort?: SortSpec): Promise<(T & { id: ID })[]> {
    const s = parseSort(sort);
    let q = supabase.from(this.cfg.table).select("*");
    if (s) q = q.order(s.column, { ascending: s.ascending });

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []).map(addCompatAliases) as any;
    return rows;
  }

  async filter(criteria: Filter<T>, sort?: SortSpec, limit?: number): Promise<(T & { id: ID })[]> {
    const s = parseSort(sort);
    let q = supabase.from(this.cfg.table).select("*");
    q = this.applyCriteria(q, criteria);
    if (s) q = q.order(s.column, { ascending: s.ascending });
    if (typeof limit === "number") q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []).map(addCompatAliases) as any;

    // Cache results if configured
    this.maybeCache(criteria as any, rows);

    return rows;
  }

  async create(data: T): Promise<T & { id: ID }> {
    const aliased = applyAliases(data as any, this.cfg.alias);
    const payload = stripUnknown(aliased, this.cfg.allowed);

    const { data: created, error } = await supabase
      .from(this.cfg.table)
      .insert(payload as any)
      .select("*")
      .single();

    if (error) throw error;

    const row = addCompatAliases(created);

    // cache refresh
    if (this.cfg.cache) {
      safeWriteCache(storageKey(this.entityKey), [row]);
    }

    return row as any;
  }

  async update(id: ID, patch: Partial<T>): Promise<T & { id: ID }> {
    const aliased = applyAliases(patch as any, this.cfg.alias);
    const payload = stripUnknown(aliased, this.cfg.allowed);

    const { data: updated, error } = await supabase
      .from(this.cfg.table)
      .update(payload as any)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    const row = addCompatAliases(updated);

    // cache refresh
    if (this.cfg.cache) {
      safeWriteCache(storageKey(this.entityKey), [row]);
    }

    return row as any;
  }

  async delete(id: ID): Promise<void> {
    const { error } = await supabase.from(this.cfg.table).delete().eq("id", id);
    if (error) throw error;

    if (this.cfg.cache) {
      safeClearCache(storageKey(this.entityKey));
    }
  }
}

// Supabase public tables (from your exported schema snippets):
// churches, courses, groups, profiles, studies
const ENTITY: Record<string, EntityConfig> = {
  ActivityFeed: { table: "activity_feed" }, // if you ever add it later (won't be used now)

  Church: {
    table: "churches",
    allowed: ["name", "slug", "description", "created_by"],
  },

  Course: {
    table: "courses",
    allowed: ["church_id", "title", "description", "tags", "cover_image_url", "is_published", "created_by"],
  },

  StudyGroup: {
    table: "groups",
    allowed: [
      "church_id",
      "name",
      "description",
      "type",
      "is_public",
      "meeting_day",
      "meeting_time",
      "location",
      "cover_image_url",
      "created_by",
    ],
  },

  Group: {
    table: "groups",
    allowed: [
      "church_id",
      "name",
      "description",
      "type",
      "is_public",
      "meeting_day",
      "meeting_time",
      "location",
      "cover_image_url",
      "created_by",
    ],
  },

  ScriptureStudy: {
    table: "studies",
    allowed: [
      "church_id",
      "title",
      "description",
      "scripture_reference",
      "book",
      "difficulty",
      "estimated_minutes",
      "tags",
      "cover_image_url",
      "is_published",
      "created_by",
    ],
  },

  UserProfile: {
    table: "profiles",
    // Support existing UI calls that use user_email
    alias: { user_email: "email" },
    allowed: ["id", "email", "display_name", "avatar_url", "role"],
    cache: true,
    cacheKeyField: "email",
  },

  // These are in your old Base44 UI, but you don't have tables for them in Supabase yet.
  // Leaving them mapped to non-existent tables would create exactly the 404s you saw.
  // If any page uses these today, you'll need to either:
  //   (A) add the tables in Supabase, or
  //   (B) refactor those pages to store sessions/blocks on an existing table.
  CourseSession: { table: "course_sessions" },
  CourseEnrollment: { table: "course_enrollments" },
  Discussion: { table: "discussions" },
  StudyProgress: { table: "study_progress" },
  StudyResponse: { table: "study_responses" },
};

function entityApi(entityKey: string) {
  const cfg = ENTITY[entityKey];
  return new SupabaseEntityApi<any>(entityKey, cfg);
}

export const base44 = {
  auth: {
    async me(): Promise<Base44User> {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const u = data.user;
      if (!u?.email) throw new Error("Not signed in");

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
      safeClearCache(storageKey("UserProfile"));
    },
  },

  entities: {
    ActivityFeed: entityApi("ActivityFeed"),
    Church: entityApi("Church"),
    Course: entityApi("Course"),
    StudyGroup: entityApi("StudyGroup"),
    Group: entityApi("Group"),
    ScriptureStudy: entityApi("ScriptureStudy"),
    UserProfile: entityApi("UserProfile"),

    // present for compatibility (but will only work if you create these tables)
    CourseSession: entityApi("CourseSession"),
    CourseEnrollment: entityApi("CourseEnrollment"),
    Discussion: entityApi("Discussion"),
    StudyProgress: entityApi("StudyProgress"),
    StudyResponse: entityApi("StudyResponse"),
  },
};
