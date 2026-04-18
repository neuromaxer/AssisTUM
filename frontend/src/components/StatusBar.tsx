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
    <div className="flex items-center gap-4 text-[11px] text-zinc-500">
      {services.map((svc) => (
        <span key={svc.key} className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              settings?.[svc.key] ? "bg-green-400" : "bg-zinc-700"
            }`}
          />
          {svc.label}
        </span>
      ))}
    </div>
  );
}
