import { BlobTable } from "../components/BlobTable";

export function BlobStorage() {
  return (
    <div className="space-y-4">
      <div>
        <h1>Blob Storage</h1>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "#5D6F7E" }}>
          Point-in-time and full backups linked to databases. When Trigger 1 is processed
          (signaled from upstream), this view reflects blob lifecycle and retention context for affected Build
          VM restores — the trigger itself is not started here.
        </p>
      </div>
      <BlobTable />
    </div>
  );
}
