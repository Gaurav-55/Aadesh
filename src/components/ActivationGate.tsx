import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

// Replace this line with the SHA-256 hash of your own master password.
const MASTER_PASSWORD_HASH = "d84f875f9bf22cc9e19cd7ff9c871bd640e9f303e4fff32c2066d500922b2bba";
const STORAGE_KEY = "aadesh_pos_activated";

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function ActivationGate({ children }: { children: ReactNode }) {
  const [activated, setActivated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActivated(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const hash = await sha256Hex(password);
    setBusy(false);
    if (hash === MASTER_PASSWORD_HASH) {
      localStorage.setItem(STORAGE_KEY, "true");
      setPassword("");
      setActivated(true);
    } else {
      setError(true);
    }
  }

  if (activated === null) return <div className="min-h-screen bg-background" />;
  if (activated) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/favicon.png" alt="" className="mb-3 h-16 w-16 rounded-2xl shadow" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Aadesh POS</h1>
          <p className="text-sm text-muted-foreground">Every Order. In Control.</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-card-foreground">Activate Aadesh POS</h2>
          </div>
          <label htmlFor="master-password" className="mb-1 block text-sm font-medium text-foreground">
            Master password
          </label>
          <div className="relative">
            <input
              id="master-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">Incorrect password</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-4 w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            Activate
          </button>
        </form>
      </div>
    </div>
  );
}
