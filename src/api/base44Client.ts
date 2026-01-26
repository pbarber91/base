// src/api/base44Client.ts
import { createClient } from "@supabase/supabase-js";

// ---- Supabase client (exported) ----
// Make sure these exist in Vercel as well:
// VITE_SUPABASE_URL
// VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ---- Existing Base44 localStorage shim (kept for legacy parts of the app) ----
const LS_PREFIX = "base44_port_";

function load(key: string) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: any) {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function sortBy(list: any[], field: string | null) {
  if (!field) return list;
  return [...list].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return String(av).localeCompare(String(bv));
  });
}

export const base44 = {
  auth: {
    async me() {
      // legacy behavior: best-effort from Supabase session if available
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!u) throw new Error("Not authenticated");

      const fullName =
        (u.user_metadata as any)?.full_name ||
        (u.user_metadata as any)?.name ||
        u.email ||
        "";

      return {
        id: u.id,
        email: u.email,
        full_name: fullName,
      };
    },
  },
  entities: {
    // Generic localStorage entity store:
    // base44.entities.<Entity>.filter/create/update/delete
    _entity(name: string) {
      return {
        async filter(where: Record<string, any> = {}, order: string | null = null, limit?: number) {
          const rows = (load(name) ?? []) as any[];
          const filtered = rows.filter((r) =>
            Object.entries(where).every(([k, v]) => r?.[k] === v)
          );
          const ordered = sortBy(filtered, order);
          return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
        },
        async create(data: any) {
          const rows = (load(name) ?? []) as any[];
          const row = {
            id: genId(),
            created_date: new Date().toISOString(),
            ...data,
          };
          rows.push(row);
          save(name, rows);
          return row;
        },
        async update(id: string, patch: any) {
          const rows = (load(name) ?? []) as any[];
          const idx = rows.findIndex((r) => r?.id === id);
          if (idx === -1) throw new Error(`${name} row not found: ${id}`);
          rows[idx] = { ...rows[idx], ...patch };
          save(name, rows);
          return rows[idx];
        },
        async delete(id: string) {
          const rows = (load(name) ?? []) as any[];
          save(
            name,
            rows.filter((r) => r?.id !== id)
          );
          return true;
        },
      };
    },

    // Keep these names since your pages already reference them
    get UserProfile() {
      return base44.entities._entity("UserProfile");
    },
    get Church() {
      return base44.entities._entity("Church");
    },
    get Course() {
      return base44.entities._entity("Course");
    },
    get CourseSession() {
      return base44.entities._entity("CourseSession");
    },
    get ScriptureStudy() {
      return base44.entities._entity("ScriptureStudy");
    },
    get StudyGroup() {
      return base44.entities._entity("StudyGroup");
    },
  },
};
