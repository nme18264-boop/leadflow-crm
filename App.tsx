import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Users,
  X,
  Pencil,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Menu,
  LoaderCircle,
  Sprout,
} from "lucide-react";
import {
  blankLead,
  demoLeads,
  filterLeads,
  statuses,
  summarize,
  validateLead,
} from "./domain";
import type { Lead, LeadInput, Status } from "./domain";
import {
  configured,
  listLeads,
  removeLead,
  saveLead,
  supabase,
} from "./supabase";

const errorText = (e: unknown) =>
  e && typeof e === "object" && "message" in e
    ? String(e.message)
    : "Something went wrong. Please try again.";
const dateLabel = (s: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(s));
function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <Sprout size={24} />
      </span>
      LeadFlow<span className="brand-crm">CRM</span>
    </span>
  );
}
function Spinner() {
  return <LoaderCircle className="spin" size={18} aria-hidden="true" />;
}
function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function LeadForm({
  lead,
  onSave,
  onClose,
  busy,
  error,
}: {
  lead: Lead | null;
  onSave: (v: LeadInput) => Promise<void>;
  onClose: () => void;
  busy: boolean;
  error: string;
}) {
  const [value, setValue] = useState<LeadInput>(
    lead
      ? {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          status: lead.status,
          notes: lead.notes,
        }
      : { ...blankLead },
  );
  const [validation, setValidation] = useState("");
  function field(key: keyof LeadInput, v: string) {
    setValue((old) => ({ ...old, [key]: v }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = {
      ...value,
      name: value.name.trim(),
      email: value.email.trim(),
      company: value.company.trim(),
      phone: value.phone.trim(),
      notes: value.notes.trim(),
    };
    const err = validateLead(clean);
    if (err) {
      setValidation(err);
      return;
    }
    setValidation("");
    await onSave(clean);
  }
  return (
    <Modal
      title={lead ? "Edit lead" : "Add a new lead"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <p className="muted">
          A little context now. A stronger relationship later.
        </p>
        <fieldset disabled={busy} className="form-fields">
          <label>
            Full name (required)
            <input
              autoFocus
              required
              maxLength={120}
              value={value.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="e.g. Amara Okafor"
            />
          </label>
          <div className="form-grid">
            <label>
              Email
              <input
                type="email"
                maxLength={254}
                value={value.email}
                onChange={(e) => field("email", e.target.value)}
                placeholder="name@company.com"
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                maxLength={40}
                value={value.phone}
                onChange={(e) => field("phone", e.target.value)}
                placeholder="+234 …"
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Company
              <input
                maxLength={160}
                value={value.company}
                onChange={(e) => field("company", e.target.value)}
                placeholder="Company name"
              />
            </label>
            <label>
              Status
              <select
                aria-label="Status"
                value={value.status}
                onChange={(e) => field("status", e.target.value as Status)}
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea
              rows={4}
              maxLength={5000}
              value={value.notes}
              onChange={(e) => field("notes", e.target.value)}
              placeholder="What should you remember about this lead?"
            />
          </label>
          <p className="small muted">
            Created{" "}
            {lead ? dateLabel(lead.created_at) : "automatically when saved"}.
            Only the name is required.
          </p>
        </fieldset>
        {(validation || error) && (
          <p className="error" role="alert">
            {validation || error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy && <Spinner />}
            {busy ? "Saving…" : lead ? "Save changes" : "Create lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Auth({
  onDemo,
  recovery,
  onRecovered,
  onCancelRecovery,
}: {
  onDemo: () => void;
  recovery: boolean;
  onRecovered: () => void;
  onCancelRecovery: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const title = recovery
    ? "Choose a new password"
    : mode === "signup"
      ? "Make room for growth."
      : mode === "reset"
        ? "Let’s get you back in."
        : "Good things start here.";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const redirect = new URL(import.meta.env.BASE_URL, window.location.origin)
        .href;
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        onRecovered();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        if (!data.session)
          setMessage("Check your email to confirm your account, then sign in.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirect + "?flow=recovery",
        });
        if (error) throw error;
        setMessage(
          "If an account exists for this email, a reset link is on its way.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function changeMode(m: typeof mode) {
    setMode(m);
    setError("");
    setMessage("");
    setPassword("");
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="story-copy">
          <span className="eyebrow">LESS ADMIN. MORE MOMENTUM.</span>
          <h1>
            Your next big win
            <br />
            starts with a<br />
            <em>small hello.</em>
          </h1>
          <p>
            A calm, focused space for your leads.
            <br />
            Keep the details close and the relationships growing.
          </p>
          <div className="story-card">
            <div className="mini-avatar">AO</div>
            <div>
              <strong>Amara Okafor</strong>
              <span>Northstar Studio</span>
            </div>
            <span className="badge won">
              <Check size={14} /> Won
            </span>
            <div className="story-card-bottom">
              <span>A conversation. A connection.</span>
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={18} /> Your workspace. Your relationships.
        </div>
      </section>
      <section className="auth-form">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-inner">
          <span className="eyebrow">WELCOME TO LEADFLOW</span>
          <h2>{title}</h2>
          <p className="muted">
            {recovery
              ? "Use at least 12 characters for your new password."
              : mode === "signup"
                ? "Your focused workspace is one step away."
                : mode === "reset"
                  ? "We’ll send a secure password reset link to your email."
                  : "Sign in to keep your next opportunity moving."}
          </p>
          {!configured && (
            <div className="setup-note">
              <strong>Live workspace not connected</strong>
              <p>
                Add your public Supabase configuration to enable authentication.
                You can explore the isolated demo below.
              </p>
            </div>
          )}
          <form onSubmit={submit}>
            <fieldset disabled={busy || !configured} className="form-fields">
              {!recovery && (
                <label>
                  Email address
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </label>
              )}
              {(recovery || mode !== "reset") && (
                <label>
                  Password
                  <input
                    required
                    type="password"
                    minLength={recovery || mode === "signup" ? 12 : 1}
                    maxLength={128}
                    autoComplete={
                      recovery || mode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup" || recovery
                        ? "At least 12 characters"
                        : "Enter your password"
                    }
                  />
                </label>
              )}
              {!recovery && mode === "login" && (
                <button
                  className="text-button forgot"
                  type="button"
                  onClick={() => changeMode("reset")}
                >
                  Forgot password?
                </button>
              )}
              <button className="primary full" disabled={busy || !configured}>
                {busy ? <Spinner /> : <ArrowRight size={18} />}{" "}
                {recovery
                  ? "Update password"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset link"
                      : "Sign in"}
              </button>
            </fieldset>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success">
              {message}
            </p>
          )}
          {!recovery && (
            <p className="auth-switch">
              {mode === "login"
                ? "New to LeadFlow? "
                : mode === "signup"
                  ? "Already have an account? "
                  : ""}
              <button
                className="text-button"
                onClick={() =>
                  changeMode(mode === "login" ? "signup" : "login")
                }
              >
                {mode === "login" ? "Create an account" : "Back to sign in"}
              </button>
            </p>
          )}
          {recovery && (
            <button
              className="text-button"
              disabled={busy}
              onClick={onCancelRecovery}
            >
              Cancel password reset and sign out
            </button>
          )}
          <div className="divider">
            <span>TAKE A LOOK AROUND</span>
          </div>
          <button
            className="secondary full"
            disabled={busy || recovery}
            onClick={onDemo}
          >
            Explore the demo <ArrowUpRight size={18} />
          </button>
          <p className="small muted centered">
            Fictional leads. No sign-up. Nothing saved.
          </p>
        </div>
        <p className="auth-footer">
          Built for independent people doing meaningful work.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [demo, setDemo] = useState(false);
  const [recovery, setRecovery] = useState(
    new URLSearchParams(location.search).get("flow") === "recovery",
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [page, setPage] = useState<"overview" | "leads">("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<Lead | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const first =
      sidebarRef.current?.querySelector<HTMLButtonElement>("button");
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) || [],
      ).filter((el) => el.offsetParent !== null);
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const onResize = () => {
      if (innerWidth > 900) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      previous?.focus();
    };
  }, [menu]);
  const request = useRef(0);
  const activeUser = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(next);
      setChecking(false);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          if (error) setLoadError(error.message);
          setSession(data.session);
          setChecking(false);
        }
      })
      .catch((e) => {
        if (active) {
          setLoadError(errorText(e));
          setChecking(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const uid = session?.user.id;
  activeUser.current = demo ? "demo" : uid;
  const load = useCallback(async () => {
    const token = ++request.current;
    if (!uid || demo) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await listLeads();
      if (token === request.current) setLeads(data);
    } catch (e) {
      if (token === request.current) setLoadError(errorText(e));
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [uid, demo]);
  useEffect(() => {
    setLeads([]);
    setEditor(undefined);
    setDeleting(null);
    setActionError("");
    setQuery("");
    setFilter("All");
    setProfile(false);
    if (demo) {
      setLeads(demoLeads());
      setLoading(false);
      setLoadError("");
    } else if (uid) {
      void load();
    }
    return () => {
      request.current++;
    };
  }, [uid, demo, load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  async function submitLead(input: LeadInput) {
    const owner = activeUser.current;
    setBusy(true);
    setActionError("");
    try {
      const saved = demo
        ? {
            ...input,
            id: editor?.id || crypto.randomUUID(),
            user_id: "demo-only",
            created_at: editor?.created_at || new Date().toISOString(),
          }
        : await saveLead(input, uid!, editor?.id);
      if (owner !== activeUser.current) return;
      setLeads((old) =>
        editor
          ? old.map((l) => (l.id === saved.id ? saved : l))
          : [saved, ...old],
      );
      setToast(editor ? "Lead updated." : "New lead added.");
      setEditor(undefined);
    } catch (e) {
      if (owner === activeUser.current) setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteLead() {
    if (!deleting) return;
    const owner = activeUser.current;
    setBusy(true);
    setActionError("");
    try {
      if (!demo) await removeLead(deleting.id);
      if (owner !== activeUser.current) return;
      setLeads((old) => old.filter((l) => l.id !== deleting.id));
      setDeleting(null);
      setToast("Lead deleted.");
    } catch (e) {
      if (owner === activeUser.current) setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      if (!demo && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setDemo(false);
      setLeads([]);
      setProfile(false);
      setMenu(false);
      setToast("");
      setRecovery(false);
      history.replaceState({}, "", location.pathname);
    } catch (e) {
      setToast("Sign-out failed: " + errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <main className="boot" role="status">
        <Brand />
        <Spinner /> Opening your workspace…
      </main>
    );
  if ((!session && !demo) || recovery)
    return (
      <>
        <Auth
          onDemo={() => {
            setDemo(true);
            setPage("overview");
          }}
          recovery={recovery}
          onRecovered={() => {
            setRecovery(false);
            history.replaceState({}, "", location.pathname);
            setToast("Password updated.");
          }}
          onCancelRecovery={() => void logout()}
        />
        {loadError && (
          <div role="alert" className="global-error">
            {loadError}
          </div>
        )}
      </>
    );
  const counts = summarize(leads);
  const visible = filterLeads(leads, query, filter);
  const initials = demo
    ? "DM"
    : session?.user.email?.slice(0, 2).toUpperCase() || "ME";
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside
        ref={sidebarRef}
        role={menu ? "dialog" : undefined}
        aria-modal={menu ? true : undefined}
        aria-label="Workspace navigation"
        className={"sidebar " + (menu ? "is-open" : "")}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <p className="workspace-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          <button
            className={page === "overview" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setPage("overview");
              setMenu(false);
            }}
          >
            <LayoutDashboard size={20} /> Overview
          </button>
          <button
            className={page === "leads" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setPage("leads");
              setMenu(false);
            }}
          >
            <Users size={20} /> All leads{" "}
            <span>{loading ? "…" : counts.Total}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sprout size={24} />
            <strong>A little follow-up goes a long way.</strong>
            <p>Your next opportunity might already be in your list.</p>
          </div>
          <div className="sidebar-account">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{demo ? "Demo workspace" : "Personal workspace"}</strong>
              <span>
                {demo ? "In-memory sample data" : "Private to your account"}
              </span>
            </div>
          </div>
          <button
            className="nav-item logout"
            disabled={busy}
            onClick={() => void logout()}
          >
            <LogOut size={18} />
            {demo ? "Exit demo" : "Sign out"}
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell" inert={menu ? true : undefined}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{page === "overview" ? "Overview" : "All leads"}</strong>
          </div>
          <div className="profile-wrap">
            <button
              className="profile-button"
              aria-label="Open profile menu"
              aria-expanded={profile}
              aria-controls="profile-panel"
              onClick={() => setProfile(!profile)}
            >
              <span className="avatar small-avatar">{initials}</span>
              <span>{demo ? "Demo account" : "My account"}</span>
              <ChevronDown size={16} />
            </button>
            {profile && (
              <>
                <button
                  className="profile-backdrop"
                  aria-label="Close profile menu"
                  onClick={() => setProfile(false)}
                />
                <div className="profile-panel" id="profile-panel">
                  <strong>{demo ? "Demo account" : session?.user.email}</strong>
                  <p>
                    {demo
                      ? "Sample records only. Changes reset on exit."
                      : "Your leads are private to your account."}
                  </p>
                  <button
                    className="nav-item"
                    disabled={busy}
                    onClick={() => void logout()}
                  >
                    <LogOut size={18} />
                    {demo ? "Exit demo" : "Sign out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main id="main" className="content">
          {demo && (
            <div className="demo-banner">
              <span>
                <span className="demo-dot" />
                <strong>Demo mode</strong> · Fictional leads, kept only in
                memory. Changes are not saved.
              </span>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setLeads(demoLeads());
                  setToast("Sample data restored.");
                }}
              >
                Reset sample data
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR RELATIONSHIPS, IN FOCUS</span>
              <h1>
                {page === "overview"
                  ? "A clearer view. A better follow-up."
                  : "Every lead. One place."}
              </h1>
              <p className="muted">
                {page === "overview"
                  ? "From the first hello to the next big win — keep things moving."
                  : "The details you need to turn conversations into clients."}
              </p>
            </div>
            <button
              className="primary"
              disabled={loading || busy || Boolean(loadError)}
              onClick={() => {
                setActionError("");
                setEditor(null);
              }}
            >
              <Plus size={18} /> Add lead
            </button>
          </div>
          {loadError ? (
            <div className="empty error-state" role="alert">
              <h2>We couldn’t load your leads.</h2>
              <p>{loadError}</p>
              <p>
                Check your connection, migration, and Supabase configuration.
              </p>
              <button className="secondary" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : (
            <>
              <section className="stats" aria-label="Lead counts">
                {(["Total", ...statuses] as const).map((s, i) => (
                  <button
                    key={s}
                    className={"stat-card " + (i === 0 ? "featured" : "")}
                    onClick={() => {
                      setFilter(s === "Total" ? "All" : s);
                      setPage("leads");
                    }}
                  >
                    <span className="stat-label">
                      {s === "Total" ? "Total leads" : s}
                      <span className={"stat-dot " + s.toLowerCase()} />
                    </span>
                    <strong>{loading ? "—" : counts[s]}</strong>
                    <span className="stat-caption">
                      {s === "Total"
                        ? "Every opportunity"
                        : s === "New"
                          ? "Ready for a hello"
                          : s === "Contacted"
                            ? "Conversations started"
                            : s === "Won"
                              ? "Relationships made"
                              : "Room to learn"}
                      <ArrowUpRight size={16} />
                    </span>
                  </button>
                ))}
              </section>
              <section className="leads-panel" aria-busy={loading}>
                <div className="panel-heading">
                  <div>
                    <h2>
                      {page === "overview"
                        ? "Your lead workspace"
                        : "All leads"}{" "}
                      <span className="count-tag">
                        {loading ? "…" : leads.length}
                      </span>
                    </h2>
                    <p className="muted small">
                      Small details. Meaningful connections.
                    </p>
                  </div>
                  {!demo && (
                    <button
                      className="text-button"
                      disabled={loading || busy}
                      onClick={() => void load()}
                    >
                      Refresh
                    </button>
                  )}
                </div>
                <div className="toolbar">
                  <div
                    className="filters"
                    role="group"
                    aria-label="Filter by status"
                  >
                    {["All", ...statuses].map((s) => (
                      <button
                        key={s}
                        aria-pressed={filter === s}
                        className={filter === s ? "filter selected" : "filter"}
                        onClick={() => setFilter(s)}
                      >
                        {s === "All" ? "All leads" : s}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={18} />
                    <span className="sr-only">Search leads</span>
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search leads…"
                    />
                  </label>
                </div>
                {loading ? (
                  <div className="empty" role="status">
                    <Spinner />
                    <p>Loading your leads…</p>
                  </div>
                ) : visible.length === 0 ? (
                  <div className="empty">
                    <span className="empty-icon">
                      <Users size={28} />
                    </span>
                    <h3>
                      {leads.length
                        ? "No matching leads"
                        : "Your next connection starts here"}
                    </h3>
                    <p>
                      {leads.length
                        ? "Try another search or status filter."
                        : "Add your first lead and give your next opportunity a home."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        if (leads.length) {
                          setQuery("");
                          setFilter("All");
                        } else {
                          setActionError("");
                          setEditor(null);
                        }
                      }}
                    >
                      {leads.length ? "Clear filters" : "Add your first lead"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Name / company</th>
                            <th scope="col">Contact</th>
                            <th scope="col">Status</th>
                            <th scope="col">Created</th>
                            <th scope="col">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((l, i) => (
                            <tr key={l.id}>
                              <td>
                                <div className="person-cell">
                                  <span
                                    className={"lead-avatar tone-" + (i % 4)}
                                  >
                                    {l.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase()}
                                  </span>
                                  <div>
                                    <button
                                      className="lead-name"
                                      onClick={() => {
                                        setActionError("");
                                        setEditor(l);
                                      }}
                                    >
                                      {l.name}
                                    </button>
                                    <span className="muted small company">
                                      {l.company || "Independent contact"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="contact-cell">
                                  {l.email ? (
                                    <a href={"mailto:" + l.email}>{l.email}</a>
                                  ) : (
                                    <span className="muted">
                                      No email added
                                    </span>
                                  )}
                                  <span className="muted small">
                                    {l.phone || "No phone added"}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={"badge " + l.status.toLowerCase()}
                                >
                                  <span className="badge-dot" />
                                  {l.status}
                                </span>
                              </td>
                              <td className="date-cell">
                                {dateLabel(l.created_at)}
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="icon-button"
                                    aria-label={"Edit " + l.name}
                                    onClick={() => {
                                      setActionError("");
                                      setEditor(l);
                                    }}
                                  >
                                    <Pencil size={17} />
                                  </button>
                                  <button
                                    className="icon-button danger-icon"
                                    aria-label={"Delete " + l.name}
                                    onClick={() => {
                                      setActionError("");
                                      setDeleting(l);
                                    }}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="panel-footer">
                      Showing {visible.length} of {leads.length} leads
                      <span>
                        {demo
                          ? "Sample workspace"
                          : "Only your records are visible"}
                      </span>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
          <footer className="workspace-footer">
            <Brand />
            <span>A little more organized. A lot more possible.</span>
          </footer>
        </main>
      </div>
      {editor !== undefined && (
        <LeadForm
          lead={editor}
          onSave={submitLead}
          onClose={() => setEditor(undefined)}
          busy={busy}
          error={actionError}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this lead?"
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <p>
            “{deleting.name}” will be permanently removed. This cannot be
            undone.
          </p>
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep lead
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => void deleteLead()}
            >
              {busy && <Spinner />}
              {busy ? "Deleting…" : "Delete lead"}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
