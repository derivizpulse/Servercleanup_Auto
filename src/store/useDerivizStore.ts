import { create } from "zustand";
import { initialDatabases } from "../data/mockDatabases";
import { initialBlobs } from "../data/mockBlobs";
import { addDaysIso, classifyDatabaseName, parseDatabaseContext } from "../lib/classify";
import type {
  ActivityEntry,
  BlobRow,
  DatabaseRow,
  DbAction,
  ToastItem,
  ToastVariant,
} from "../types";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Build a complete audit entry with DB + server resolved from state when possible */
function makeActivityEntry(
  get: () => { databases: DatabaseRow[] },
  message: string,
  options?: {
    dbId?: string;
    /** Override name/server (e.g. before row is updated) */
    dbName?: string;
    server?: string;
    category?: ActivityEntry["category"];
  }
): ActivityEntry {
  const { dbId, dbName, server, category } = options ?? {};
  const db =
    dbId && !dbName ? get().databases.find((d) => d.id === dbId) : undefined;
  return {
    id: newId(),
    at: new Date().toISOString(),
    message,
    dbId,
    dbName: dbName ?? db?.name,
    server: server ?? db?.server,
    category: category ?? (dbId || dbName || server ? "manual" : "system"),
  };
}

const MAX_TOASTS = 5;
const TOAST_MS = 4000;

const trigger1Filter = (db: DatabaseRow) =>
  db.environment === "Build VM" && db.restoredByStaging;

const csEnvs = new Set<DatabaseRow["environment"]>(["SB", "ITL"]);

function summarizeTrigger2(
  next: DatabaseRow[],
  prev: DatabaseRow[]
): string {
  const prevMap = new Map(prev.map((d) => [d.id, d]));
  let nLive = 0;
  let nBuild = 0;
  let nCs = 0;
  for (const db of next) {
    const o = prevMap.get(db.id);
    if (!o) continue;
    const changed =
      o.action !== db.action ||
      o.deletionDate !== db.deletionDate ||
      o.autoBackedUp !== db.autoBackedUp;
    if (!changed) continue;
    const u = db.name.toUpperCase();
    if (u.includes("_LIVE")) nLive++;
    else if (db.environment === "Build VM") nBuild++;
    else if (csEnvs.has(db.environment)) nCs++;
  }
  return `Live: ${nLive} → Backup & Delete (+30d) · Build VM: ${nBuild} → Delete (+5d) · CS envs: ${nCs} → Scheduled Delete (+7d).`;
}

let toastTimerById: Record<string, number> = {};

function scheduleToastDismiss(
  store: { dismissToast: (id: string) => void },
  id: string
) {
  if (typeof window === "undefined") return;
  if (toastTimerById[id]) clearTimeout(toastTimerById[id]);
  toastTimerById[id] = window.setTimeout(() => {
    store.dismissToast(id);
    delete toastTimerById[id];
  }, TOAST_MS);
}

interface DerivizState {
  databases: DatabaseRow[];
  blobs: BlobRow[];
  excludedIds: string[];
  deletedIds: string[];
  deletedAtById: Record<string, string>;
  activityLog: ActivityEntry[];
  toasts: ToastItem[];
  trigger1LastFired: string | null;
  trigger2LastFired: string | null;
  trigger1BlobNoticeVisible: boolean;
  lastTrigger1DbIds: string[];
  lastTrigger2DbIds: string[];
  lastTrigger2Summary: string;

  setExcluded: (id: string, value: boolean) => void;
  scheduleDeletionByDate: (id: string, deletionDateIso: string) => void;
  deleteNow: (id: string) => void;
  liftExclusion: (id: string) => void;
  addToast: (message: string, variant: ToastVariant) => void;
  dismissToast: (id: string) => void;
  dismissTrigger1BlobNotice: () => void;
  logActivity: (message: string, dbId?: string) => void;

  fireTrigger1: () => void;
  fireTrigger2: () => void;
  setManualOverride: (
    dbId: string,
    action: Exclude<DbAction, "None" | "Scheduled Delete">
  ) => void;
  refreshClassification: (dbId: string) => void;
}

export const useDerivizStore = create<DerivizState>()((set, get) => {
  const pushToast = (message: string, variant: ToastVariant) => {
    const id = newId();
    set((s) => ({
      toasts: [{ id, message, variant }, ...s.toasts].slice(0, MAX_TOASTS),
    }));
    scheduleToastDismiss({ dismissToast: (tid) => get().dismissToast(tid) }, id);
  };

  return {
    databases: initialDatabases.map((d) => ({ ...d })),
    blobs: initialBlobs.map((b) => ({ ...b })),
    excludedIds: ["db-7", "db-8"],
    deletedIds: ["db-10", "db-14"],
    deletedAtById: {
      "db-10": addDaysIso(new Date(), -4),
      "db-14": addDaysIso(new Date(), -62),
    },
    activityLog: [
      {
        id: newId(),
        at: new Date().toISOString(),
        message: "Deriviz initialized — 18 databases across 4 server groups",
        dbName: "—",
        server: "All",
        category: "system",
      },
    ],
    toasts: [],
    /** Seeded for UI: real product receives these timestamps from the integration. */
    trigger1LastFired: "2026-04-10T11:00:00.000Z",
    trigger2LastFired: "2026-04-12T14:30:00.000Z",
    trigger1BlobNoticeVisible: false,
    lastTrigger1DbIds: ["db-1", "db-2"],
    lastTrigger2DbIds: [],
    lastTrigger2Summary:
      "Last run: _LIVE → Backup & delete (+30d) · Build VM → Delete (+5d) · SB/ITL → Scheduled delete (+7d), excluding opted-out DBs.",

    setExcluded: (id, value) =>
      set((s) => {
        const db = s.databases.find((d) => d.id === id);
        const next = new Set(s.excludedIds);
        if (value) next.add(id);
        else next.delete(id);
        const logEntry: ActivityEntry = {
          id: newId(),
          at: new Date().toISOString(),
          message: value
            ? "Marked excluded from batch / automated actions"
            : "Removed from exclusion list",
          dbId: id,
          dbName: db?.name,
          server: db?.server,
          category: "manual",
        };
        return {
          excludedIds: Array.from(next),
          activityLog: [logEntry, ...s.activityLog].slice(0, 200),
        };
      }),

    scheduleDeletionByDate: (id, deletionDateIso) => {
      const now = new Date();
      const actionIso = addDaysIso(now, 0);
      set((s) => {
        const before = s.databases.find((d) => d.id === id);
        const databases = s.databases.map((db) => {
          if (db.id !== id) return db;
          const action =
            db.action === "Backup & Delete"
              ? ("Backup & Delete" as const)
              : db.action === "Delete"
                ? ("Delete" as const)
                : ("Scheduled Delete" as const);
          const days =
            Math.max(
              1,
              Math.round(
                (new Date(deletionDateIso).getTime() - new Date(actionIso).getTime()) / 86_400_000
              )
            ) || 1;
          return {
            ...db,
            action,
            actionDate: actionIso,
            deletionDate: deletionDateIso,
            windowDays: days,
          };
        });
        const msg = `Scheduled by user for ${new Date(deletionDateIso).toLocaleDateString()}${
          before && before.deletionDate ? ` (was ${new Date(before.deletionDate).toLocaleDateString()})` : ""
        }`;
        return {
          databases,
          activityLog: [
            makeActivityEntry(get, msg, { dbId: id, category: "manual" }),
            ...s.activityLog,
          ].slice(0, 200),
          excludedIds: s.excludedIds.filter((x) => x !== id),
        };
      });
      pushToast("Deletion date updated.", "info");
    },

    deleteNow: (id) => {
      const deletedAt = new Date().toISOString();
      const entry = makeActivityEntry(get, "Deleted immediately (manual)", {
        dbId: id,
        category: "manual",
      });
      set((s) => ({
        deletedIds: s.deletedIds.includes(id) ? s.deletedIds : [...s.deletedIds, id],
        deletedAtById: {
          ...s.deletedAtById,
          [id]: deletedAt,
        },
        activityLog: [entry, ...s.activityLog].slice(0, 200),
      }));
      get().addToast("Database deleted immediately.", "success");
    },

    liftExclusion: (id) => {
      set((s) => {
        const db = s.databases.find((d) => d.id === id);
        const logEntry: ActivityEntry = {
          id: newId(),
          at: new Date().toISOString(),
          message: "Exclusion lifted — returned to active monitoring",
          dbId: id,
          dbName: db?.name,
          server: db?.server,
          category: "manual",
        };
        return {
          excludedIds: s.excludedIds.filter((x) => x !== id),
          databases: s.databases.map((db) =>
            db.id === id
              ? { ...db, action: "None" as const, actionDate: null, deletionDate: null }
              : db
          ),
          activityLog: [logEntry, ...s.activityLog].slice(0, 200),
        };
      });
      get().addToast("Exclusion lifted. Database returned to monitoring.", "info");
    },

    addToast: (message, variant) => {
      const id = newId();
      set((s) => ({
        toasts: [{ id, message, variant }, ...s.toasts].slice(0, MAX_TOASTS),
      }));
      scheduleToastDismiss(
        { dismissToast: (tid) => get().dismissToast(tid) },
        id
      );
    },

    dismissToast: (id) => {
      if (toastTimerById[id]) {
        clearTimeout(toastTimerById[id]);
        delete toastTimerById[id];
      }
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    dismissTrigger1BlobNotice: () => set({ trigger1BlobNoticeVisible: false }),

    logActivity: (message, dbId) => {
      set((s) => ({
        activityLog: [
          makeActivityEntry(get, message, { dbId, category: "manual" }),
          ...s.activityLog,
        ].slice(0, 200),
      }));
    },

    fireTrigger1: () => {
      const now = new Date();
      const isoNow = addDaysIso(now, 0);
      const t5 = addDaysIso(now, 5);
      const ex = new Set(get().excludedIds);
      set((s) => {
        const targetIds: string[] = [];
        const databases = s.databases.map((db) => {
          if (!trigger1Filter(db)) return db;
          if (ex.has(db.id)) return db;
          targetIds.push(db.id);
          return {
            ...db,
            action: "Delete" as const,
            actionDate: isoNow,
            deletionDate: t5,
          };
        });
        const at = new Date().toISOString();
        const dbEntries: ActivityEntry[] = targetIds.map((id) => {
          const row = databases.find((d) => d.id === id);
          return {
            id: newId(),
            at,
            message:
              "Deletion scheduled in 5 days (Build VM / Staging Restorer policy)",
            dbId: id,
            dbName: row?.name,
            server: row?.server,
            category: "trigger" as const,
          };
        });
        const top: ActivityEntry = {
          id: newId(),
          at,
          message:
            "Trigger 1: SB & ITL deliverables complete — Staging Restorer Build VM deletions scheduled",
          dbName: "—",
          server: "—",
          category: "trigger",
        };
        return {
          databases,
          activityLog: [top, ...dbEntries, ...s.activityLog].slice(0, 200),
          trigger1LastFired: at,
          lastTrigger1DbIds: targetIds,
          trigger1BlobNoticeVisible: true,
        };
      });
      pushToast(
        "Trigger 1 fired — deletion scheduled for Build VM DBs. Review linked blob backups.",
        "success"
      );
    },

    fireTrigger2: () => {
      const now = new Date();
      const s = get();
      const ex = new Set(s.excludedIds);
      const prevDbs = s.databases;
      set((st) => {
        const changedIds: string[] = [];
        const next = st.databases.map((db) => {
          if (ex.has(db.id)) return db;
          const nameU = db.name.toUpperCase();
          if (nameU.includes("_LIVE")) {
            changedIds.push(db.id);
            return {
              ...db,
              action: "Backup & Delete" as const,
              actionDate: addDaysIso(now, 0),
              deletionDate: addDaysIso(now, 30),
              autoBackedUp: true,
            };
          }
          if (db.environment === "Build VM") {
            changedIds.push(db.id);
            return {
              ...db,
              action: "Delete" as const,
              actionDate: addDaysIso(now, 0),
              deletionDate: addDaysIso(now, 5),
            };
          }
          if (csEnvs.has(db.environment)) {
            changedIds.push(db.id);
            return {
              ...db,
              action: "Scheduled Delete" as const,
              actionDate: addDaysIso(now, 0),
              deletionDate: addDaysIso(now, 7),
            };
          }
          return db;
        });
        const at = new Date().toISOString();
        const summary = summarizeTrigger2(next, prevDbs);
        const act: ActivityEntry = {
          id: newId(),
          at,
          message: `Trigger 2: Conversion implemented — ${summary}`,
          dbName: "—",
          server: "—",
          category: "trigger",
        };
        const perDbEntries: ActivityEntry[] = changedIds.map((id) => {
          const row = next.find((d) => d.id === id)!;
          const prev = prevDbs.find((d) => d.id === id);
          const actionLabel = row.action;
          return {
            id: newId(),
            at,
            message: `Lifecycle action set to "${actionLabel}"${
              prev && prev.action !== row.action ? ` (was "${prev.action}")` : ""
            }`,
            dbId: id,
            dbName: row.name,
            server: row.server,
            category: "trigger" as const,
          };
        });
        return {
          databases: next,
          activityLog: [act, ...perDbEntries, ...st.activityLog].slice(0, 200),
          trigger2LastFired: at,
          lastTrigger2DbIds: changedIds,
          lastTrigger2Summary: summary,
        };
      });
      const summary2 = get().lastTrigger2Summary;
      pushToast(
        `Trigger 2 fired. ${summary2}`,
        "info"
      );
    },

    setManualOverride: (dbId, action) => {
      const now = new Date();
      set((st) => {
        const databases = st.databases.map((db) => {
          if (db.id !== dbId) return db;
          if (action === "Retain") {
            return {
              ...db,
              action: "Retain" as const,
              actionDate: null,
              deletionDate: null,
            };
          }
          if (action === "Delete") {
            return {
              ...db,
              action: "Delete" as const,
              actionDate: addDaysIso(now, 0),
              deletionDate: addDaysIso(now, 5),
            };
          }
          if (action === "Backup & Delete") {
            return {
              ...db,
              action: "Backup & Delete" as const,
              actionDate: addDaysIso(now, 0),
              deletionDate: addDaysIso(now, 30),
              autoBackedUp: true,
            };
          }
          return db;
        });
        return { databases };
      });
      get().logActivity(`Manual override: ${action}`, dbId);
    },

    refreshClassification: (dbId) =>
      set((st) => ({
        databases: st.databases.map((db) => {
          if (db.id !== dbId) return db;
          const parsed = parseDatabaseContext(db.name);
          return {
            ...db,
            accountName: parsed.accountName,
            conversionName: parsed.conversionName,
            liveCopyNumber: parsed.liveCopyNumber,
            classification: classifyDatabaseName(db.name),
          };
        }),
      })),
  };
});

export function useTrigger1Targets() {
  return useDerivizStore((s) => s.databases.filter(trigger1Filter));
}

export function useActivityForDb(dbId: string) {
  return useDerivizStore((s) =>
    s.activityLog.filter((a) => a.dbId === dbId).slice(0, 20)
  );
}
