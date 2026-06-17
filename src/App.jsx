import React, { useEffect, useState, useCallback } from "react";
import {
  Shield, Flag, Award, Crown, Trophy, Star, CheckCircle2, Circle, Lock,
  ChevronLeft, ChevronRight, ClipboardCheck, PenLine, LogOut, Clock, Search,
} from "lucide-react";
import curriculum from "./content/curriculum.json";
import sampleBank from "./content/testbank.sample.json";
import { auth, profiles, progress, tests, signoffs, certs, activity } from "./lib/api";

/* ---- brand ---- */
const C = { navy: "#2C3D8F", navyDeep: "#1B2566", navyInk: "#171C3D", lime: "#D4FF00", red: "#FF3C50", slate: "#565C82", mute: "#8B93C4" };
const ICONS = { trainee: Shield, rookie: Flag, rally: Award, wrc: Crown, champion: Trophy };
const LEVELS = curriculum.levels;
const modId = (levelKey, code) => `${levelKey}-${code}`;
const allModules = (lvl) => lvl.phases.flatMap((p) => p.modules.map((m) => ({ ...m, phase: p.phase, id: modId(lvl.key, m.code) })));
const fmt = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }); };

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booted, setBooted] = useState(false);
  const [mode, setMode] = useState("train"); // train | assessor

  useEffect(() => {
    const { data: sub } = auth.onChange(async (u) => {
      setUser(u);
      setProfile(u ? await profiles.me() : null);
      setBooted(true);
    });
    (async () => { const u = await auth.getUser(); setUser(u); setProfile(u ? await profiles.me() : null); setBooted(true); })();
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  if (!booted) return <Shell><Center>Loading…</Center></Shell>;
  if (!user) return <Shell><SignIn /></Shell>;
  if (!profile) return <Shell><CreateProfile email={user.email} onDone={async () => setProfile(await profiles.me())} /></Shell>;

  const staff = ["assessor", "manager", "admin"].includes(profile.role);
  return (
    <Shell>
      <TopBar profile={profile} staff={staff} mode={mode} setMode={setMode} onSignOut={() => auth.signOut()} />
      {mode === "assessor" && staff ? <Assessor me={profile} /> : <MyTraining profile={profile} />}
    </Shell>
  );
}

/* ---------------- shell ---------------- */
function Shell({ children }) {
  return (
    <div style={{ minHeight: "100%", color: "white", background: `radial-gradient(1100px 560px at 72% -12%, ${C.navy}, ${C.navyDeep} 55%, ${C.navyInk})` }}>
      <div className="mx-auto px-4 pb-16 pt-5" style={{ maxWidth: 900 }}>{children}</div>
    </div>
  );
}
const Center = ({ children }) => <div style={{ textAlign: "center", paddingTop: 80, color: C.mute }}>{children}</div>;
function TopBar({ profile, staff, mode, setMode, onSignOut }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
      <div>
        <div style={{ color: C.lime, fontWeight: 800, letterSpacing: 2 }}>POWERPLAY</div>
        <div style={{ color: C.mute, fontSize: 11, letterSpacing: 2 }}>THE ACADEMY</div>
      </div>
      <div className="flex items-center" style={{ gap: 8 }}>
        {staff && (
          <button onClick={() => setMode(mode === "assessor" ? "train" : "assessor")}
            style={{ ...btn, background: "rgba(255,255,255,.08)", color: "white", display: "flex", alignItems: "center", gap: 6 }}>
            <PenLine size={14} color={C.lime} /> {mode === "assessor" ? "My training" : "Assessor"}
          </button>
        )}
        <span style={{ fontSize: 12, color: C.mute }}>{profile.full_name}</span>
        <button onClick={onSignOut} title="Sign out" style={{ ...btn, background: "rgba(255,255,255,.08)", padding: 8 }}><LogOut size={15} color={C.mute} /></button>
      </div>
    </div>
  );
}

/* ---------------- auth ---------------- */
function SignIn() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  return (
    <div style={{ maxWidth: 380, paddingTop: 24 }}>
      <h1 style={{ fontSize: 34, fontWeight: 800 }}>Become race-ready.</h1>
      <p style={{ color: "#D4D9F5", margin: "12px 0 22px" }}>Sign in to start or continue your PowerPlay Academy training.</p>
      {sent ? (
        <div style={card}><b>Check your email.</b><p style={{ color: C.slate, fontSize: 14 }}>We sent a sign-in link to {email}.</p></div>
      ) : (
        <>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@powerplay.com" style={input} />
          <button disabled={!email} onClick={async () => { await auth.signInWithEmail(email); setSent(true); }}
            style={{ ...btnBig, background: email ? C.lime : "rgba(255,255,255,.12)", color: email ? C.navyInk : C.mute }}>
            Email me a sign-in link
          </button>
        </>
      )}
    </div>
  );
}
function CreateProfile({ email, onDone }) {
  const [f, setF] = useState({ full_name: "", email: email || "", venue: "" });
  const ok = f.full_name.trim();
  return (
    <div style={{ maxWidth: 420 }}>
      <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Start your training</h2>
      <p style={{ color: "#D4D9F5", fontSize: 14, marginBottom: 18 }}>This creates your record. Progress is dated and saved as you go.</p>
      {["full_name", "email", "venue"].map((k) => (
        <label key={k} style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.mute, fontWeight: 700 }}>{k === "full_name" ? "Full name" : k === "email" ? "Email" : "Venue (optional)"}</span>
          <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={input} />
        </label>
      ))}
      <button disabled={!ok} onClick={async () => { await profiles.create(f); onDone(); }}
        style={{ ...btnBig, background: ok ? C.lime : "rgba(255,255,255,.12)", color: ok ? C.navyInk : C.mute }}>Start training</button>
    </div>
  );
}

/* ---------------- trainee: my training ---------------- */
function MyTraining({ profile }) {
  const [data, setData] = useState(null);
  const [openLevel, setOpenLevel] = useState(null);
  const [view, setView] = useState("dash"); // dash | module | test
  const [openMod, setOpenMod] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const refresh = useCallback(async () => {
    const [learned, signs, cert, attempts, log] = await Promise.all([
      progress.learnedFor(profile.id), signoffs.forProfile(profile.id), certs.forProfile(profile.id),
      tests.attemptsFor(profile.id), activity.forProfile(profile.id),
    ]);
    const passedLevels = {}; attempts.forEach((a) => { if (a.passed) passedLevels[a.level_key] = a; });
    setData({ learned, signs, cert, passedLevels, log });
  }, [profile.id]);
  useEffect(() => { refresh(); }, [refresh]);

  if (!data) return <Center>Loading your progress…</Center>;
  const certifiedCount = LEVELS.filter((l) => data.cert[l.key]).length;
  const activeIdx = Math.min(certifiedCount, LEVELS.length - 1);
  const aLevel = LEVELS[openLevel != null ? openLevel : activeIdx];

  if (view === "module" && openMod) {
    return <ModuleView level={aLevel} mod={openMod} done={!!data.learned[openMod.id]}
      onBack={() => setView("dash")} onComplete={async () => { await progress.markLearned(profile.id, openMod.id, `${aLevel.name}: ${openMod.title}`); await refresh(); setView("dash"); }} />;
  }
  if (view === "test") {
    return <TestRunner level={aLevel} onBack={() => setView("dash")} onPass={async (score, safetyOk) => { await tests.saveAttempt(profile.id, aLevel.key, { score, safetyOk, passed: true }, aLevel.name); await refresh(); setView("dash"); }} />;
  }

  const mods = allModules(aLevel);
  const modsDone = mods.filter((m) => data.learned[m.id]).length;
  const testPassed = !!data.passedLevels[aLevel.key];
  const signedCount = mods.filter((m) => data.signs[m.id]?.outcome === "competent").length;
  const certified = !!data.cert[aLevel.key];

  return (
    <div>
      <div className="flex items-end justify-between" style={{ flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div><div style={{ color: C.mute, fontSize: 13 }}>Welcome back,</div><h2 style={{ fontSize: 30, fontWeight: 800 }}>{profile.full_name}</h2></div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.mute }}>CURRENT RANK</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.lime }}>{certifiedCount ? LEVELS[certifiedCount - 1].name : "Not yet certified"}</div>
        </div>
      </div>

      {/* ladder */}
      <div className="flex" style={{ gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 16 }}>
        {LEVELS.map((l, i) => {
          const Icon = ICONS[l.key] || Star; const cert = !!data.cert[l.key]; const active = i === activeIdx && !cert; const locked = i > certifiedCount;
          return (
            <button key={l.key} disabled={locked} onClick={() => { setOpenLevel(i); }}
              className="flex items-center" style={{ gap: 8, padding: "8px 12px", borderRadius: 12, flexShrink: 0,
                background: cert ? C.lime : active ? "white" : "rgba(255,255,255,.07)", color: cert || active ? C.navyInk : C.mute,
                outline: active ? `2px solid ${C.lime}` : "none", opacity: locked ? 0.5 : 1, cursor: locked ? "default" : "pointer", border: "none" }}>
              {cert ? <CheckCircle2 size={15} /> : locked ? <Lock size={13} /> : <Icon size={15} />}
              <span style={{ fontSize: 12, fontWeight: 700 }}>{l.name}</span>
            </button>
          );
        })}
      </div>

      <div style={card}>
        <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{aLevel.name}</div>
          <Pill tone={certified ? "lime" : "navy"}>{certified ? "Certified" : "In progress"}</Pill>
        </div>
        <div style={{ fontSize: 12, color: C.slate, marginBottom: 14 }}>{aLevel.duration} · sign-off by {aLevel.signoffAuthority}</div>

        {aLevel.phases.map((ph) => (
          <div key={ph.phase} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: C.navy, marginBottom: 6 }}>{ph.phase.toUpperCase()}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {ph.modules.map((m) => {
                const id = modId(aLevel.key, m.code); const done = data.learned[id]; const sign = data.signs[id];
                return (
                  <button key={id} onClick={() => { setOpenMod({ ...m, id, phase: ph.phase }); setView("module"); }}
                    className="flex items-center" style={{ gap: 10, textAlign: "left", padding: "9px 11px", borderRadius: 12,
                      border: `1px solid ${done ? "#cfe9d8" : "#e6e9f7"}`, background: done ? "#f3fbf6" : "white", cursor: "pointer" }}>
                    {done ? <CheckCircle2 size={17} color="#1a8f4c" /> : <Circle size={17} color="#c2c8e6" />}
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.navyInk }}>{m.title}</span>
                    {sign?.outcome === "competent" && <Pill tone="green">practical ✓</Pill>}
                    {done ? <span style={{ fontSize: 11, color: "#1a8f4c" }}>{fmt(done).split(" · ")[0]}</span> : <ChevronRight size={15} color={C.slate} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
          <div style={{ ...subcard }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Online test</span>
              {testPassed ? <Pill tone="green">Passed {data.passedLevels[aLevel.key].score}%</Pill> : <Pill>Not done</Pill>}
            </div>
            <p style={{ fontSize: 11, color: C.slate, marginBottom: 8 }}>{curriculum.passRule.note}</p>
            <button disabled={modsDone < mods.length} onClick={() => setView("test")}
              style={{ ...btnFull, background: modsDone >= mods.length ? C.navy : "#e7eaf6", color: modsDone >= mods.length ? "white" : C.slate }}>
              {testPassed ? "Retake" : modsDone >= mods.length ? "Take the test" : "Finish modules first"}
            </button>
          </div>
          <div style={{ ...subcard }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Practical sign-off</span>
              <Pill tone={signedCount === mods.length && mods.length ? "green" : "ghost"}>{signedCount}/{mods.length}</Pill>
            </div>
            <p style={{ fontSize: 11, color: C.slate }}>Your assessor ({aLevel.signoffAuthority}) signs off each module on the floor.</p>
          </div>
        </div>
      </div>

      <button onClick={() => setShowLog((s) => !s)} className="flex items-center" style={{ gap: 8, marginTop: 18, color: C.lime, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>
        <Clock size={15} /> Activity log {showLog ? "▾" : "▸"}
      </button>
      {showLog && (
        <div style={{ marginTop: 12, borderRadius: 16, padding: 16, background: "rgba(255,255,255,.06)" }}>
          {data.log.length === 0 ? <span style={{ color: C.mute, fontSize: 14 }}>No activity yet.</span> :
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {data.log.map((h) => (
                <li key={h.id} className="flex" style={{ gap: 12, fontSize: 14 }}>
                  <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: 99, background: C.lime, flexShrink: 0 }} />
                  <span>{h.text}<br /><span style={{ fontSize: 11, color: C.mute }}>{fmt(h.at)}</span></span>
                </li>
              ))}
            </ol>}
        </div>
      )}
    </div>
  );
}

/* ---------------- module ---------------- */
function ModuleView({ level, mod, done, onBack, onComplete }) {
  const [ack, setAck] = useState(done);
  return (
    <div style={{ maxWidth: 680 }}>
      <BackLink onClick={onBack}>Back to my training</BackLink>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: C.lime, marginBottom: 4 }}>{level.name.toUpperCase()} · {mod.phase.toUpperCase()}</div>
      <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 14 }}>{mod.title}</h2>
      <div style={card}>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {(mod.content || []).map((p, i) => (
            <li key={i} className="flex" style={{ gap: 8, fontSize: 15, color: C.navyInk }}><span style={{ color: C.red }}>◆</span><span>{p}</span></li>
          ))}
        </ul>
      </div>
      {done ? <div className="flex items-center" style={{ gap: 8, marginTop: 16, color: C.lime, fontWeight: 700 }}><CheckCircle2 size={16} /> Completed</div> : (
        <>
          <label className="flex" style={{ gap: 10, marginTop: 18, cursor: "pointer" }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 14, color: "#D4D9F5" }}>I've read and understood this module.</span>
          </label>
          <button disabled={!ack} onClick={onComplete} style={{ ...btnBig, background: ack ? C.lime : "rgba(255,255,255,.12)", color: ack ? C.navyInk : C.mute }}>Mark complete</button>
        </>
      )}
    </div>
  );
}

/* ---------------- test ---------------- */
function TestRunner({ level, onBack, onPass }) {
  const [qs, setQs] = useState(null);
  const [ans, setAns] = useState({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { (async () => {
    let q = await tests.questions(level.key);
    if (!q.length) q = (sampleBank[level.key] || []).map((x, i) => ({ id: i, question: x.question, options: x.options, correct_index: x.correct_index, is_safety: x.is_safety }));
    setQs(q);
  })(); }, [level.key]);

  if (!qs) return <Center>Loading test…</Center>;
  if (!qs.length) return <div style={{ maxWidth: 420 }}><BackLink onClick={onBack}>Back</BackLink><p style={{ marginTop: 12 }}>No test bank loaded for {level.name} yet. Author it in <code>test_questions</code>.</p></div>;

  const total = qs.length;
  const correct = qs.filter((q, i) => ans[i] === q.correct_index).length;
  const safetyOk = qs.filter((q) => q.is_safety).every((q) => ans[qs.indexOf(q)] === q.correct_index);
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= curriculum.passRule.overallPercent && safetyOk;
  const all = Object.keys(ans).length === total;

  return (
    <div style={{ maxWidth: 680 }}>
      <BackLink onClick={onBack}>Back</BackLink>
      <h2 style={{ fontSize: 30, fontWeight: 800 }}>{level.name} test</h2>
      <p style={{ fontSize: 14, color: "#D4D9F5", marginBottom: 18 }}>{curriculum.passRule.note}</p>
      <div style={{ display: "grid", gap: 12 }}>
        {qs.map((q, i) => (
          <div key={i} style={card}>
            <div className="flex" style={{ gap: 8, marginBottom: 12, alignItems: "flex-start" }}>
              <span style={{ fontWeight: 800, color: C.navy }}>{i + 1}.</span>
              <span style={{ fontWeight: 700, flex: 1 }}>{q.question}</span>
              {q.is_safety && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: C.red, color: "white" }}>SAFETY</span>}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {q.options.map((opt, oi) => {
                const chosen = ans[i] === oi, right = submitted && oi === q.correct_index, wrong = submitted && chosen && oi !== q.correct_index;
                return (
                  <button key={oi} disabled={submitted} onClick={() => setAns((a) => ({ ...a, [i]: oi }))}
                    className="flex items-center" style={{ gap: 8, textAlign: "left", fontSize: 14, padding: "8px 12px", borderRadius: 12,
                      border: `1px solid ${right ? "#1a8f4c" : wrong ? C.red : chosen ? C.navy : "#e2e6f5"}`,
                      background: right ? "#eafaf0" : wrong ? "#ffeef0" : chosen ? "#eef1ff" : "white", color: C.navyInk, cursor: submitted ? "default" : "pointer" }}>
                    {chosen ? <CheckCircle2 size={15} color={C.navy} /> : <Circle size={15} color="#c2c8e6" />}{opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!submitted ? (
        <button disabled={!all} onClick={() => setSubmitted(true)} style={{ ...btnBig, background: all ? C.lime : "rgba(255,255,255,.12)", color: all ? C.navyInk : C.mute }}>
          {all ? "Submit test" : "Answer all questions"}
        </button>
      ) : (
        <div style={{ ...card, background: passed ? C.lime : "white", textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{pct}%</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{correct}/{total} · safety {safetyOk ? "100%" : "missed"}</div>
          {passed ? <button onClick={() => onPass(pct, safetyOk)} style={{ ...btnPill, background: C.navy, color: "white" }}>Save pass & continue</button>
            : <><p style={{ color: C.red, fontSize: 14, marginBottom: 10 }}>{safetyOk ? "Need 90% overall." : "Every safety question must be correct."}</p>
              <button onClick={() => { setSubmitted(false); setAns({}); }} style={{ ...btnPill, background: C.navy, color: "white" }}>Try again</button></>}
        </div>
      )}
    </div>
  );
}

/* ---------------- assessor ---------------- */
function Assessor({ me }) {
  const [roster, setRoster] = useState(null);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { (async () => { const { data } = await profiles.list(); setRoster(data || []); })(); }, []);

  if (open) return <AssessorPerson me={me} person={open} onBack={() => setOpen(null)} />;
  const list = (roster || []).filter((u) => !q || (u.full_name + (u.email || "") + (u.venue || "")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>Trainees</h2>
      <p style={{ color: "#D4D9F5", fontSize: 14, marginBottom: 14 }}>Open a person to review their dated progress and sign off each module's practical.</p>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color={C.mute} style={{ position: "absolute", left: 12, top: 13 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, venue…" style={{ ...input, paddingLeft: 34 }} />
      </div>
      {roster === null ? <Center>Loading…</Center> : list.length === 0 ? <div style={{ ...card, textAlign: "center", color: C.mute }}>No trainees yet.</div> : (
        <div style={{ display: "grid", gap: 8 }}>
          {list.map((u) => (
            <button key={u.id} onClick={() => setOpen(u)} className="flex items-center" style={{ gap: 12, textAlign: "left", ...card, cursor: "pointer" }}>
              <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 99, background: C.navy, color: C.lime, fontWeight: 700, flexShrink: 0 }}>{u.full_name.slice(0, 1).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, color: C.navyInk }}>{u.full_name}</div><div style={{ fontSize: 12, color: C.slate }}>{u.venue || u.email}</div></div>
              <ChevronRight size={16} color={C.slate} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessorPerson({ me, person, onBack }) {
  const [d, setD] = useState(null);
  const refresh = useCallback(async () => {
    const [learned, signs, cert, attempts, log] = await Promise.all([
      progress.learnedFor(person.id), signoffs.forProfile(person.id), certs.forProfile(person.id),
      tests.attemptsFor(person.id), activity.forProfile(person.id),
    ]);
    const passed = {}; attempts.forEach((a) => { if (a.passed) passed[a.level_key] = a; });
    setD({ learned, signs, cert, passed, log });
  }, [person.id]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!d) return <Center>Loading…</Center>;

  const sign = async (level, m, outcome) => {
    const initials = window.prompt(`Your initials to sign off "${m.title}" as ${outcome === "competent" ? "competent" : "not yet"}:`, "");
    if (initials === null) return;
    await signoffs.sign({ profileId: person.id, moduleId: m.id, outcome, assessorName: me.full_name, initials, label: `${level.name}: ${m.title}` });
    await refresh();
  };
  const certify = async (level) => { await certs.certify(person.id, level.key, me.full_name, level.name); await refresh(); };

  return (
    <div style={{ maxWidth: 760 }}>
      <BackLink onClick={onBack}>All trainees</BackLink>
      <h2 style={{ fontSize: 30, fontWeight: 800 }}>{person.full_name}</h2>
      <div style={{ fontSize: 13, color: "#D4D9F5", marginBottom: 18 }}>{person.email}{person.venue ? " · " + person.venue : ""}</div>

      {LEVELS.map((level) => {
        const mods = allModules(level);
        const signed = mods.filter((m) => d.signs[m.id]?.outcome === "competent").length;
        const testPassed = !!d.passed[level.key];
        const certified = !!d.cert[level.key];
        const canCertify = testPassed && signed === mods.length && !certified;
        return (
          <div key={level.key} style={{ ...card, marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>{level.name}</div>
              {certified ? <Pill tone="green">Certified</Pill> : <Pill tone="navy">{signed}/{mods.length} signed · test {testPassed ? "✓" : "—"}</Pill>}
            </div>
            <div style={{ fontSize: 11, color: C.mute, marginBottom: 8 }}>Authority: {level.signoffAuthority}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {mods.map((m) => {
                const s = d.signs[m.id]; const learned = d.learned[m.id];
                return (
                  <div key={m.id} style={{ border: "1px solid #e6e9f7", borderRadius: 10, padding: "8px 10px" }}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.navyInk }}>{m.title}</span>
                      {s ? <span style={{ fontSize: 11, color: s.outcome === "competent" ? "#1a8f4c" : C.red }}>{s.outcome === "competent" ? "✓ " : "✗ "}{s.assessor_name} ({s.initials}) · {fmt(s.signed_at).split(" · ")[0]}</span>
                        : <span style={{ fontSize: 11, color: C.mute }}>{learned ? "learned · awaiting" : "not started"}</span>}
                    </div>
                    {!!(m.practicalCriteria || []).length && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none", display: "grid", gap: 2 }}>
                        {m.practicalCriteria.map((c, i) => <li key={i} style={{ fontSize: 11, color: C.slate }}>☐ {c}</li>)}
                      </ul>
                    )}
                    {!s && (
                      <div className="flex" style={{ gap: 6, marginTop: 6 }}>
                        <button onClick={() => sign(level, m, "competent")} style={{ ...btnMini, background: C.red, color: "white" }}>Sign off</button>
                        <button onClick={() => sign(level, m, "not_yet")} style={{ ...btnMini, background: "#eef1ff", color: C.navy }}>Not yet</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {canCertify && <button onClick={() => certify(level)} style={{ ...btnFull, background: C.lime, color: C.navyInk, marginTop: 10 }}>Certify {level.name}</button>}
          </div>
        );
      })}

      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: C.lime, margin: "18px 0 8px" }}>FULL DATED LOG</div>
      <div style={{ borderRadius: 16, padding: 16, background: "rgba(255,255,255,.06)" }}>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {d.log.map((h) => <li key={h.id} className="flex" style={{ gap: 12, fontSize: 14 }}><span style={{ marginTop: 6, width: 6, height: 6, borderRadius: 99, background: C.lime, flexShrink: 0 }} /><span>{h.text}<br /><span style={{ fontSize: 11, color: C.mute }}>{fmt(h.at)}</span></span></li>)}
        </ol>
      </div>
    </div>
  );
}

/* ---------------- bits ---------------- */
function Pill({ children, tone = "ghost" }) {
  const map = { lime: [C.lime, C.navyInk], navy: [C.navy, "white"], green: ["#eafaf0", "#1a8f4c"], ghost: ["rgba(255,255,255,.12)", C.mute] };
  const [bg, fg] = map[tone] || map.ghost;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: bg, color: fg }}>{children}</span>;
}
const BackLink = ({ onClick, children }) => (
  <button onClick={onClick} className="flex items-center" style={{ gap: 4, fontSize: 14, color: C.mute, background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}><ChevronLeft size={16} /> {children}</button>
);
const card = { borderRadius: 16, padding: 16, background: "white", color: C.navyInk, boxShadow: "0 10px 24px rgba(0,0,0,.18)" };
const subcard = { borderRadius: 12, padding: 12, border: "1px solid #e6e9f7", background: "white" };
const input = { width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 12, fontSize: 14, border: "none", outline: "none", background: "white", color: C.navyInk };
const btn = { borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" };
const btnBig = { width: "100%", marginTop: 16, padding: "12px", borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer" };
const btnFull = { width: "100%", padding: "9px", borderRadius: 10, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" };
const btnPill = { padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" };
const btnMini = { padding: "5px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" };
