import { useAuthStatus, type AuthStatus } from "../hooks/useSettings";

const services: { key: keyof AuthStatus; label: string }[] = [
  { key: "tum_online", label: "TUM Online" },
  { key: "tum_calendar", label: "TUM Calendar" },
  { key: "moodle", label: "Moodle" },
  { key: "email", label: "TUM Email" },
];

export function StatusBar() {
  const { data: status } = useAuthStatus();

  return (
    <div className="flex items-center gap-4 text-[11px] text-zinc-500">
      {services.map((svc) => (
        <span key={svc.key} className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status?.[svc.key] ? "bg-green-400" : "bg-zinc-700"
            }`}
          />
          {svc.label}
        </span>
      ))}
    </div>
  );
}
