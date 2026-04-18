import { useState } from "react";
import { useAuthStatus } from "../hooks/useSettings";

const inputClass =
  "w-full bg-zinc-800/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-tum-blue/50";

const btnClass =
  "bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-sm px-3 py-2 rounded-lg transition-colors";

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <span className={`text-xs ${connected ? "text-green-400" : "text-zinc-600"}`}>
      {label ?? (connected ? "Connected" : "Not connected")}
    </span>
  );
}

function Feedback({ message, isError }: { message: string | null; isError?: boolean }) {
  if (!message) return null;
  return (
    <p className={`text-xs mt-1 ${isError ? "text-red-400" : "text-green-400"}`}>{message}</p>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: status, refetch } = useAuthStatus();

  const [tumId, setTumId] = useState("");
  const [tumMsg, setTumMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [tumLoading, setTumLoading] = useState(false);

  const [icalUrl, setIcalUrl] = useState("");
  const [icalMsg, setIcalMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [icalLoading, setIcalLoading] = useState(false);

  const [moodleUser, setMoodleUser] = useState("");
  const [moodlePass, setMoodlePass] = useState("");
  const [moodleMsg, setMoodleMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [moodleLoading, setMoodleLoading] = useState(false);

  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  if (!open) return null;

  const connectTumOnline = async () => {
    setTumLoading(true);
    setTumMsg(null);
    try {
      const res = await fetch("/api/auth/tum-online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tum_id: tumId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTumMsg({ text: data.error, error: true });
      } else {
        setTumMsg({ text: data.message, error: false });
        refetch();
      }
    } catch (err: any) {
      setTumMsg({ text: err.message, error: true });
    } finally {
      setTumLoading(false);
    }
  };

  const confirmTumToken = async () => {
    setTumLoading(true);
    try {
      const res = await fetch("/api/auth/tum-online/confirm", { method: "POST" });
      const data = await res.json();
      if (data.confirmed) {
        setTumMsg({ text: "Token confirmed!", error: false });
        refetch();
      } else {
        setTumMsg({ text: "Not confirmed yet — check your email", error: true });
      }
    } catch (err: any) {
      setTumMsg({ text: err.message, error: true });
    } finally {
      setTumLoading(false);
    }
  };

  const connectIcal = async () => {
    setIcalLoading(true);
    setIcalMsg(null);
    try {
      const res = await fetch("/api/auth/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: icalUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIcalMsg({ text: data.error, error: true });
      } else {
        setIcalMsg({ text: "Calendar connected!", error: false });
        refetch();
      }
    } catch (err: any) {
      setIcalMsg({ text: err.message, error: true });
    } finally {
      setIcalLoading(false);
    }
  };

  const connectMoodle = async () => {
    setMoodleLoading(true);
    setMoodleMsg(null);
    try {
      const res = await fetch("/api/auth/moodle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: moodleUser, password: moodlePass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMoodleMsg({ text: data.error, error: true });
      } else {
        setMoodleMsg({ text: "Moodle connected!", error: false });
        setMoodlePass("");
        refetch();
      }
    } catch (err: any) {
      setMoodleMsg({ text: err.message, error: true });
    } finally {
      setMoodleLoading(false);
    }
  };

  const connectEmail = async () => {
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: emailUser, password: emailPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailMsg({ text: data.error, error: true });
      } else {
        setEmailMsg({ text: "Email connected!", error: false });
        setEmailPass("");
        refetch();
      }
    } catch (err: any) {
      setEmailMsg({ text: err.message, error: true });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-[520px] max-h-[80vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Settings</h2>

        {/* TUM Online API */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-400">TUM Online API</h3>
            <StatusBadge connected={!!status?.tum_online} />
          </div>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="TUM ID (e.g. ge12abc)" value={tumId} onChange={(e) => setTumId(e.target.value)} />
            <button className={btnClass} disabled={tumLoading || !tumId} onClick={connectTumOnline}>
              {tumLoading ? "..." : "Request Token"}
            </button>
            {status?.tum_online === false && (
              <button className={btnClass} disabled={tumLoading} onClick={confirmTumToken}>
                Confirm
              </button>
            )}
          </div>
          <Feedback message={tumMsg?.text ?? null} isError={tumMsg?.error} />
        </div>

        {/* TUM Calendar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-400">TUM Calendar (iCal)</h3>
            <StatusBadge connected={!!status?.tum_calendar} />
          </div>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Paste iCal subscription URL" value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} />
            <button className={btnClass} disabled={icalLoading || !icalUrl} onClick={connectIcal}>
              {icalLoading ? "..." : "Save"}
            </button>
          </div>
          <Feedback message={icalMsg?.text ?? null} isError={icalMsg?.error} />
        </div>

        {/* Moodle */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-400">Moodle</h3>
            <StatusBadge connected={!!status?.moodle} />
          </div>
          <input className={inputClass} placeholder="TUM username" value={moodleUser} onChange={(e) => setMoodleUser(e.target.value)} />
          <input className={inputClass} placeholder="Password" type="password" value={moodlePass} onChange={(e) => setMoodlePass(e.target.value)} />
          <button className={btnClass} disabled={moodleLoading || !moodleUser || !moodlePass} onClick={connectMoodle}>
            {moodleLoading ? "Connecting..." : "Connect"}
          </button>
          <Feedback message={moodleMsg?.text ?? null} isError={moodleMsg?.error} />
        </div>

        {/* TUM Email */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-400">TUM Email</h3>
            <StatusBadge connected={!!status?.email} />
          </div>
          <input className={inputClass} placeholder="TUM ID (e.g. ge12abc)" value={emailUser} onChange={(e) => setEmailUser(e.target.value)} />
          <input className={inputClass} placeholder="Password" type="password" value={emailPass} onChange={(e) => setEmailPass(e.target.value)} />
          <button className={btnClass} disabled={emailLoading || !emailUser || !emailPass} onClick={connectEmail}>
            {emailLoading ? "Verifying..." : "Connect"}
          </button>
          <Feedback message={emailMsg?.text ?? null} isError={emailMsg?.error} />
        </div>

        <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-sm py-2.5 rounded-lg transition-colors" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
