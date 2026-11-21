import { site } from "@/content/site";

const fmt = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${suffix}`;
};

export function OpeningHours({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p>
        Open Wednesday to Monday, 9:30 am – 6:30 pm.
        <br />
        Closed on Tuesdays.
      </p>
    );
  }
  return (
    <dl className="divide-y divide-line text-[0.95rem]">
      {site.hours.map((h) => (
        <div key={h.day} className="flex justify-between gap-6 py-2.5">
          <dt>{h.day}</dt>
          <dd className={h.open ? "" : "text-muted"}>{h.open && h.close ? `${fmt(h.open)} – ${fmt(h.close)}` : "Closed"}</dd>
        </div>
      ))}
    </dl>
  );
}
