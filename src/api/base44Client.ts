/*
  This is a compatibility shim so the exported Base44 UI can run outside Base44.
  It implements the subset of the Base44 client used in your pages:
    - base44.auth.me()
    - base44.auth.redirectToLogin()
    - base44.entities.<Entity>.list()/filter()/create()/update()/delete()

  Right now it uses localStorage as a simple data store.
  Swap this out later for Supabase / Postgres / your own API.
*/

type ID = string;

type SortSpec = string | null | undefined; // e.g. '-created_date'

type Filter<T> = Partial<Record<keyof T, any>>;

function uuid(): string {
  // RFC4122 v4-ish; fine for local dev
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function storageKey(entityName: string) {
  return `base44_port_${entityName}`;
}

function load<T extends Record<string, any>>(entityName: string): T[] {
  const raw = localStorage.getItem(storageKey(entityName));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function save<T extends Record<string, any>>(entityName: string, rows: T[]) {
  localStorage.setItem(storageKey(entityName), JSON.stringify(rows));
}

function applySort<T extends Record<string, any>>(rows: T[], sort?: SortSpec): T[] {
  if (!sort) return rows;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return desc ? 1 : -1;
    if (bv == null) return desc ? -1 : 1;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function matches<T extends Record<string, any>>(row: T, criteria: Filter<T>): boolean {
  for (const [k, v] of Object.entries(criteria)) {
    if (v === undefined || v === null) continue;
    if (row[k as keyof T] !== v) return false;
  }
  return true;
}

class EntityApi<T extends Record<string, any>> {
  constructor(private entityName: string) {}

  async list(sort?: SortSpec): Promise<(T & { id: ID })[]> {
    const rows = load<T & { id: ID }>(this.entityName);
    return applySort(rows, sort);
  }

  async filter(criteria: Filter<T>, sort?: SortSpec, limit?: number): Promise<(T & { id: ID })[]> {
    const rows = load<T & { id: ID }>(this.entityName).filter(r => matches(r, criteria));
    const sorted = applySort(rows, sort);
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  }

  async create(data: T): Promise<T & { id: ID }> {
    const rows = load<T & { id: ID }>(this.entityName);
    const now = new Date().toISOString();
    const row = { ...(data as any), id: uuid(), created_date: (data as any).created_date ?? now } as T & { id: ID };
    rows.unshift(row);
    save(this.entityName, rows);
    return row;
  }

  async update(id: ID, patch: Partial<T>): Promise<T & { id: ID }> {
    const rows = load<T & { id: ID }>(this.entityName);
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`${this.entityName} not found: ${id}`);
    rows[idx] = { ...rows[idx], ...patch };
    save(this.entityName, rows);
    return rows[idx];
  }

  async delete(id: ID): Promise<void> {
    const rows = load<T & { id: ID }>(this.entityName);
    save(this.entityName, rows.filter(r => r.id !== id));
  }
}

// Minimal user shape used by pages
export type Base44User = {
  email: string;
  full_name?: string;
};

export const base44 = {
  auth: {
    async me(): Promise<Base44User> {
      const raw = localStorage.getItem("base44_port_user");
      if (!raw) throw new Error("Not signed in");
      return JSON.parse(raw) as Base44User;
    },
    redirectToLogin() {
      // simple: take them to get-started page
      window.location.href = "/get-started";
    },
    // helper for local dev
    _setMockUser(user: Base44User) {
      localStorage.setItem("base44_port_user", JSON.stringify(user));
    },
    _signOut() {
      localStorage.removeItem("base44_port_user");
    }
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
  }
};
