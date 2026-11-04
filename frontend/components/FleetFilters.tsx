"use client";

interface Group {
  value: string;
  label: string;
  count: number;
}

export default function FleetFilters({
  groups,
  activeGroup,
  onGroupChange,
  capacity,
  onCapacityChange,
  total,
  shown,
}: {
  groups: Group[];
  activeGroup: string;
  onGroupChange: (value: string) => void;
  capacity: string;
  onCapacityChange: (value: string) => void;
  total: number;
  shown: number;
}) {
  return (
    <div className="max-w-content mx-auto container-px mb-10">
      <div className="bg-white border border-line rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              key={group.value}
              onClick={() => onGroupChange(group.value)}
              className={`text-xs px-3 py-2 rounded-md transition-colors ${
                activeGroup === group.value
                  ? "bg-ink text-cream"
                  : "text-ink/70 hover:bg-sage/60"
              }`}
            >
              {group.label}{" "}
              <span
                className={
                  activeGroup === group.value ? "text-cream/60" : "text-muted"
                }
              >
                {group.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={capacity}
            onChange={(event) => onCapacityChange(event.target.value)}
            className="text-xs border border-line rounded-md px-3 py-2 bg-cream text-ink"
          >
            <option value="any">Any capacity</option>
            <option value="small">1–4 executive</option>
            <option value="medium">5–7 MPV / SUV</option>
            <option value="large">8+ van / coach</option>
          </select>
          <span className="text-xs text-muted whitespace-nowrap">
            Showing {shown} of {total} verified vehicles
          </span>
        </div>
      </div>
    </div>
  );
}
