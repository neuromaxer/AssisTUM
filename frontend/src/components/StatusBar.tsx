import { useSettings } from "../hooks/useSettings";

const services = [
  { key: "tum_online_token", label: "TUM Online" },
  { key: "tum_ical_url", label: "TUM Calendar" },
  { key: "moodle_token", label: "Moodle" },
  { key: "tum_email_user", label: "TUM Email" },
];

export function StatusBar() {
  const { data: settings } = useSettings();

  return (
    <div className="flex items-center gap-4 text-(--text-xs) text-ink-muted">
      {services.map((svc) => (
        <span key={svc.key} className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              settings?.[svc.key] ? "bg-success" : "bg-ink-faint"
            }`}
          />
          {svc.label}
        </span>
      ))}
    </div>
  );
}
