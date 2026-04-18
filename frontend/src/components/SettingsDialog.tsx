import { useState } from "react";
import { useAuthStatus } from "../hooks/useSettings";
import { useSyncCourses } from "../hooks/useCourses";
import { useClubs, useAddClub, useDeleteClub } from "../hooks/useClubs";

const inputClass =
  "w-full bg-surface border border-border rounded-(--radius-md) px-3 py-2 text-(--text-sm) font-mono text-ink placeholder-ink-faint focus:outline-none focus:border-accent/50 transition-colors";

const buttonClass =
  "bg-surface-hover hover:bg-surface-active disabled:opacity-40 text-(--text-sm) px-3 py-2 rounded-(--radius-md) font-medium transition-colors";

type ServiceResult = { ok: boolean; message: string };

function Dot({ color }: { color: "green" | "red" | "yellow" }) {
  const bg = color === "green" ? "bg-emerald-400" : color === "yellow" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${bg}`} />;
}

function Feedback({ message, isError }: { message: string | null; isError?: boolean }) {
  if (!message) return null;
  return (
    <p className={`text-(--text-xs) mt-1 ${isError ? "text-error" : "text-success"}`}>{message}</p>
  );
}

function ServiceRow({ label, connected, pending, result, action, statusNode }: {
  label: string;
  connected: boolean;
  pending?: boolean;
  result?: ServiceResult;
  action?: React.ReactNode;
  statusNode?: React.ReactNode;
}) {
  const isPendingResult = result && pending;
  const dotColor = result
    ? (isPendingResult ? "yellow" : result.ok ? "green" : "red")
    : pending ? "yellow" : connected ? "green" : "red";
  const statusText = result
    ? result.message
    : pending ? "Pending confirmation" : connected ? "Connected" : "Not connected";
  const textColor = result
    ? (isPendingResult ? "text-amber-500" : result.ok ? "text-success" : "text-error")
    : pending ? "text-amber-500" : connected ? "text-success" : "text-ink-faint";

  return (
    <div className="flex items-center gap-2.5 py-1">
      <Dot color={dotColor} />
      <span className="text-(--text-sm) text-ink w-24 shrink-0">{label}</span>
      <span className={`text-(--text-xs) ${textColor} flex-1`}>{statusNode ?? statusText}</span>
      {action}
    </div>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: status, refetch } = useAuthStatus();

  const [tumId, setTumId] = useState("");
  const [password, setPassword] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, ServiceResult> | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const syncCourses = useSyncCourses();
  const [syncMsg, setSyncMsg] = useState<{ text: string; error: boolean } | null>(null);

  const { data: clubs } = useClubs();
  const addClub = useAddClub();
  const deleteClub = useDeleteClub();
  const [clubName, setClubName] = useState("");
  const [clubUrl, setClubUrl] = useState("");
  const [clubMsg, setClubMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [cogneeUrl, setCogneeUrl] = useState("");
  const [cogneeKey, setCogneeKey] = useState("");
  const [cogneeLoading, setCogneeLoading] = useState(false);
  const [cogneeMsg, setCogneeMsg] = useState<{ text: string; error: boolean } | null>(null);

  if (!open) return null;

  const tumPending = status?.tum_online === "pending";
  const tumConnected = status?.tum_online === "connected";

  const connectAll = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/auth/connect-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tum_id: tumId, password, ical_url: icalUrl || undefined }),
      });
      const data = await res.json();
      setResults(data.results);
      setPassword("");
      refetch();
    } catch (err: any) {
      setResults({ general: { ok: false, message: err.message } });
    } finally {
      setLoading(false);
    }
  };

  const confirmTumToken = async () => {
    setConfirmLoading(true);
    try {
      const res = await fetch("/api/auth/tum-online/confirm", { method: "POST" });
      const data = await res.json();
      if (data.confirmed) {
        setResults((prev) => ({ ...prev, tum_online: { ok: true, message: "Confirmed!" } }));
        refetch();
        setSyncMsg(null);
        try {
          const result = await syncCourses.mutateAsync();
          setSyncMsg({ text: `Synced ${result.synced} courses`, error: false });
        } catch (err: any) {
          setSyncMsg({ text: err.message, error: true });
        }
      } else {
        setResults((prev) => ({ ...prev, tum_online: { ok: false, message: "Not confirmed yet — check your TUM email" } }));
      }
    } catch (err: any) {
      setResults((prev) => ({ ...prev, tum_online: { ok: false, message: err.message } }));
    } finally {
      setConfirmLoading(false);
    }
  };

  const tumConfirmed = tumConnected || (results?.tum_online?.ok && results.tum_online.message === "Confirmed!");
  const showConfirmButton = !tumConfirmed && (tumPending || results?.tum_online != null);

  const saveCognee = async () => {
    setCogneeLoading(true);
    setCogneeMsg(null);
    try {
      await fetch("/api/settings/cognee_url", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: cogneeUrl }),
      });
      await fetch("/api/settings/cognee_api_key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: cogneeKey }),
      });
      setCogneeMsg({ text: "Saved!", error: false });
      setCogneeKey("");
      refetch();
    } catch (err: any) {
      setCogneeMsg({ text: err.message, error: true });
    } finally {
      setCogneeLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-(--radius-lg) p-(--spacing-panel) w-[520px] max-h-[90vh] overflow-y-auto space-y-(--spacing-section) shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-(--text-lg) font-semibold text-ink">Settings</h2>

        <div className="space-y-(--spacing-element)">
          <h3 className="text-(--text-sm) font-medium text-ink-secondary">TUM Credentials</h3>
          <input className={inputClass} placeholder="TUM ID (e.g. ge12abc)" value={tumId} onChange={(e) => setTumId(e.target.value)} />
          <input className={inputClass} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className={inputClass} placeholder="iCal subscription URL (optional)" value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} />
          <button
            className={`${buttonClass} w-full`}
            disabled={loading || !tumId || !password}
            onClick={connectAll}
          >
            {loading ? "Connecting..." : "Connect All Services"}
          </button>
        </div>

        <div className="space-y-0.5">
          <h3 className="text-(--text-xs) font-medium text-ink-faint uppercase tracking-wide mb-1">Services</h3>
          <ServiceRow
            label="TUM Online"
            connected={tumConnected}
            pending={tumPending || (results?.tum_online?.ok === true && !tumConfirmed)}
            result={results?.tum_online}
            statusNode={showConfirmButton ? (
              <>Check your TUM email or <a href="https://campus.tum.de/tumonline/wbservicesadmin.userTokenManagement" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">confirm here</a></>
            ) : undefined}
            action={showConfirmButton ? (
              <button
                className={`${buttonClass} text-(--text-xs) py-1 px-2 shrink-0`}
                disabled={confirmLoading}
                onClick={confirmTumToken}
              >
                {confirmLoading ? "..." : "Confirm"}
              </button>
            ) : undefined}
          />
          <ServiceRow label="Moodle" connected={!!status?.moodle} result={results?.moodle} />
          <ServiceRow label="Email" connected={!!status?.email} result={results?.email} />
          <ServiceRow label="Calendar" connected={!!status?.tum_calendar} result={results?.calendar} />
          <ServiceRow label="Memory" connected={!!status?.cognee} result={results?.cognee} />
          {results?.general && (
            <Feedback message={results.general.message} isError={!results.general.ok} />
          )}
        </div>

        {(syncCourses.isPending || syncMsg) && (
          <div className="flex items-center gap-2">
            {syncCourses.isPending && <span className="text-(--text-xs) text-ink-faint">Syncing courses...</span>}
            <Feedback message={syncMsg?.text ?? null} isError={syncMsg?.error} />
          </div>
        )}

        <div className="space-y-(--spacing-element)">
          <h3 className="text-(--text-sm) font-medium text-ink-secondary">Cognee Cloud</h3>
          <input
            className={inputClass}
            placeholder="Cognee Cloud URL (e.g. https://your-instance.cognee.ai)"
            value={cogneeUrl}
            onChange={(e) => setCogneeUrl(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Cognee API Key"
            type="password"
            value={cogneeKey}
            onChange={(e) => setCogneeKey(e.target.value)}
          />
          <button
            className={`${buttonClass} w-full`}
            disabled={cogneeLoading || !cogneeUrl || !cogneeKey}
            onClick={saveCognee}
          >
            {cogneeLoading ? "Saving..." : "Save Cognee Settings"}
          </button>
          <Feedback message={cogneeMsg?.text ?? null} isError={cogneeMsg?.error} />
        </div>

        <div className="space-y-(--spacing-element)">
          <div className="flex items-center gap-2">
            <h3 className="text-(--text-sm) font-medium text-ink-secondary">Student Clubs</h3>
            <span className="text-(--text-xs) text-ink-faint">{clubs?.length ?? 0} configured</span>
          </div>
          {clubs && clubs.length > 0 && (
            <div className="space-y-1">
              {clubs.map((club) => (
                <div key={club.id} className="flex items-center gap-2 bg-surface-hover rounded-(--radius-md) px-3 py-1.5">
                  <span className="text-(--text-sm) font-medium text-ink flex-1 truncate">{club.name}</span>
                  <span className="text-(--text-xs) text-ink-faint truncate max-w-[200px]">{club.url}</span>
                  <button
                    className="text-(--text-xs) text-error hover:text-error/80 transition-colors shrink-0"
                    onClick={async () => {
                      try {
                        await deleteClub.mutateAsync(club.id);
                      } catch (err: any) {
                        setClubMsg({ text: err.message, error: true });
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Club name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              style={{ flex: "0 0 35%" }}
            />
            <input
              className={inputClass}
              placeholder="Events page URL"
              value={clubUrl}
              onChange={(e) => setClubUrl(e.target.value)}
            />
            <button
              className={buttonClass}
              disabled={addClub.isPending || !clubName || !clubUrl}
              onClick={async () => {
                setClubMsg(null);
                try {
                  await addClub.mutateAsync({ name: clubName, url: clubUrl });
                  setClubName("");
                  setClubUrl("");
                  setClubMsg({ text: "Club added!", error: false });
                } catch (err: any) {
                  setClubMsg({ text: err.message, error: true });
                }
              }}
            >
              {addClub.isPending ? "..." : "Add"}
            </button>
          </div>
          <Feedback message={clubMsg?.text ?? null} isError={clubMsg?.error} />
        </div>

        <button
          className="w-full bg-surface-hover hover:bg-surface-active text-(--text-sm) py-2.5 rounded-(--radius-md) font-medium transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
