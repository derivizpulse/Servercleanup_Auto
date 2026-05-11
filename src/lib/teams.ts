import type { ActivityEntry, DatabaseRow } from "../types";

export type TeamId = "US" | "UK" | "AU";
export type TeamFilter = "All" | TeamId;

export const DEFAULT_TEAM_FILTER: TeamFilter = "US";

export const TEAM_FILTER_OPTIONS: { value: TeamFilter; label: string }[] = [
  { value: "All", label: "All teams" },
  { value: "US", label: "US team" },
  { value: "UK", label: "UK team" },
  { value: "AU", label: "AU team" },
];

/** Server group prefix (e.g. Aquila-2 → Aquila). */
export function serverGroup(server: string): string {
  return server.split("-")[0] ?? server;
}

const GROUP_TEAM: Record<string, TeamId> = {
  Aquila: "US",
  SB: "US",
  Raven: "UK",
  ITL: "AU",
};

export function teamForServer(server: string): TeamId {
  return GROUP_TEAM[serverGroup(server)] ?? "US";
}

export function teamFilterLabel(filter: TeamFilter): string {
  return TEAM_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? filter;
}

export function matchesTeamFilter(server: string, filter: TeamFilter): boolean {
  if (filter === "All") return true;
  return teamForServer(server) === filter;
}

export function activityEntryMatchesTeam(
  entry: ActivityEntry,
  databases: DatabaseRow[],
  filter: TeamFilter,
): boolean {
  if (filter === "All") return true;
  if (entry.server && entry.server !== "All") {
    return matchesTeamFilter(entry.server, filter);
  }
  if (entry.dbId) {
    const db = databases.find((d) => d.id === entry.dbId);
    if (db) return matchesTeamFilter(db.server, filter);
  }
  return false;
}
