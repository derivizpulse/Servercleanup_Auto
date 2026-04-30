import type { BlobRow } from "../types";

export const initialBlobs: BlobRow[] = [
  {
    id: "bl-1",
    backupFile: "blob://backups/CLIENT_ABC_LIVE_20240401.bak",
    linkedDbId: "db-1",
    linkedDbName: "CLIENT_ABC_LIVE",
    sizeGb: 52.1,
    scheduledDeletion: null,
    status: "Active",
  },
  {
    id: "bl-2",
    backupFile: "blob://backups/CONV_XYZ_2024_diff.bak",
    linkedDbId: "db-2",
    linkedDbName: "CONV_XYZ_2024",
    sizeGb: 30,
    scheduledDeletion: null,
    status: "Backup",
  },
  {
    id: "bl-3",
    backupFile: "blob://archive/LEGACY_DUMP_01_full.bak",
    linkedDbId: "db-4",
    linkedDbName: "LEGACY_DUMP_01",
    sizeGb: 88,
    scheduledDeletion: "2026-05-01T00:00:00.000Z",
    status: "Scheduled",
  },
  {
    id: "bl-4",
    backupFile: "blob://temp/BUILD_STAGING_99.bak",
    linkedDbId: "db-10",
    linkedDbName: "STAGING_MIRROR",
    sizeGb: 14.2,
    scheduledDeletion: null,
    status: "Delete",
  },
  {
    id: "bl-5",
    backupFile: "blob://live/PROD_WEST_LIVE_snap.bak",
    linkedDbId: "db-6",
    linkedDbName: "PROD_WEST_LIVE",
    sizeGb: 115,
    scheduledDeletion: null,
    status: "Live",
  },
];
