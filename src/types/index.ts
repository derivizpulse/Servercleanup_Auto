export type SourceEnvironment =
  | "Aquila"
  | "Raven"
  | "Build VM"
  | "Mig"
  | "Mig2"
  | "SB"
  | "ITL";

export type Classification = "Account" | "Conversion" | "Live" | "Ungrouped";

export type DbAction =
  | "None"
  | "Delete"
  | "Backup"
  | "Backup & Delete"
  | "Scheduled Delete";

/** Which automation trigger is responsible for this row */
export type DbTrigger = "Trigger 1" | "Trigger 2" | "None";

/** Deliverable / conversion status label shown in the table */
export type DeliverableStatus =
  | "SB Completed"
  | "ITL Completed"
  | "LIVE Completed"
  | null;

export interface DatabaseRow {
  id: string;
  name: string;
  /** Parsed from the standard DB name: AccountName_ConversionName[_LIVE][_n] */
  accountName: string | null;
  conversionName: string | null;
  liveCopyNumber: number | null;
  /** Human-readable server / environment label */
  server: string;
  environment: SourceEnvironment;
  sizeGb: number;
  classification: Classification;
  action: DbAction;
  trigger: DbTrigger;
  /** Short lifecycle-stage label (shown in Deliverable/conv.status column) */
  deliverableStatus: DeliverableStatus;
  actionDate: string | null;
  deletionDate: string | null;
  /** scheduled window length in days (for "Day X of Y" countdown) */
  windowDays: number | null;
  restoredByStaging: boolean;
  autoBackedUp: boolean;
}

export type ToastVariant = "success" | "warning" | "danger" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ActivityEntry {
  id: string;
  at: string;
  message: string;
  /** Affected row (if any) — snapshot for audit */
  dbId?: string;
  dbName?: string;
  server?: string;
  /** e.g. trigger, delete, override, system */
  category?: "system" | "trigger" | "manual" | "automation";
}

/** Long-running user-initiated work (backup, delete, etc.) — shown on Operations */
export type OperationKind =
  | "backup"
  | "delete"
  | "backup_and_delete"
  | "reschedule"
  | "schedule_delete";

export type OperationStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface OperationJob {
  id: string;
  dbId: string;
  dbName: string;
  server: string;
  kind: OperationKind;
  status: OperationStatus;
  /** 0–100 */
  progress: number;
  message: string;
  startedAt: string;
  updatedAt: string;
  error?: string;
  /** Optional batch id when many DBs were actioned together */
  batchId?: string;
}

export interface BlobRow {
  id: string;
  backupFile: string;
  linkedDbId: string;
  linkedDbName: string;
  sizeGb: number;
  scheduledDeletion: string | null;
  status: "Active" | "Scheduled" | "Delete" | "Backup" | "Live";
}
