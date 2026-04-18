import { useState, useEffect } from "react";
import { useSettings, useSaveSetting } from "../hooks/useSettings";

const inputClass =
  "w-full bg-zinc-800/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-tum-blue/50";

const buttonClass =
  "bg-zinc-800 hover:bg-zinc-700 text-sm px-3 py-2 rounded-lg transition-colors";

function Section({
  title,
  connected,
  children,
}: {
  title: string;
  connected: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        {connected && <span className="text-xs text-green-400">Connected</span>}
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: settings } = useSettings();
  const save = useSaveSetting();

  const [tumId, setTumId] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [moodleUser, setMoodleUser] = useState("");
  const [moodlePass, setMoodlePass] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");

  useEffect(() => {
    if (settings) {
      setTumId(settings["tum_id"] ?? "");
      setIcalUrl(settings["tum_ical_url"] ?? "");
      setMoodleUser(settings["moodle_user"] ?? "");
      setMoodlePass("");
      setEmailUser(settings["tum_email_user"] ?? "");
      setEmailPass("");
    }
  }, [settings]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-[520px] max-h-[80vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Settings</h2>

        {/* TUM Online API */}
        <Section title="TUM Online API" connected={!!settings?.["tum_id"]}>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="TUM ID (e.g. ge12abc)"
              value={tumId}
              onChange={(e) => setTumId(e.target.value)}
            />
            <button
              className={buttonClass}
              onClick={() => save.mutate({ key: "tum_id", value: tumId })}
            >
              Connect
            </button>
          </div>
        </Section>

        {/* TUM Calendar (iCal) */}
        <Section title="TUM Calendar (iCal)" connected={!!settings?.["tum_ical_url"]}>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="iCal URL"
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
            />
            <button
              className={buttonClass}
              onClick={() => save.mutate({ key: "tum_ical_url", value: icalUrl })}
            >
              Save
            </button>
          </div>
        </Section>

        {/* Moodle */}
        <Section title="Moodle" connected={!!settings?.["moodle_token"]}>
          <div className="space-y-2">
            <input
              className={inputClass}
              placeholder="Moodle username"
              value={moodleUser}
              onChange={(e) => setMoodleUser(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Password"
              type="password"
              value={moodlePass}
              onChange={(e) => setMoodlePass(e.target.value)}
            />
            <button
              className={buttonClass}
              onClick={() => save.mutate({ key: "moodle_token", value: "placeholder" })}
            >
              Connect
            </button>
          </div>
        </Section>

        {/* TUM Email */}
        <Section title="TUM Email" connected={!!settings?.["tum_email_user"]}>
          <div className="space-y-2">
            <input
              className={inputClass}
              placeholder="TUM ID"
              value={emailUser}
              onChange={(e) => setEmailUser(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Password"
              type="password"
              value={emailPass}
              onChange={(e) => setEmailPass(e.target.value)}
            />
            <button
              className={buttonClass}
              onClick={() => {
                save.mutate({ key: "tum_email_user", value: emailUser });
                save.mutate({ key: "tum_email_password", value: emailPass });
              }}
            >
              Connect
            </button>
          </div>
        </Section>

        <button
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-sm py-2.5 rounded-lg transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
