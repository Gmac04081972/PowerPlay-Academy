import React, { useEffect, useState, useCallback } from "react";
import {
  Shield, Flag, Award, Crown, Trophy, Star, CheckCircle2, Circle,
  Lock, ChevronLeft, ChevronRight, Clock, Search, UserPlus,
  LogOut, PenLine, Eye, X, Check, AlertCircle, Menu,
} from "lucide-react";
import curriculum from "./content/curriculum.json";
import sampleBank from "./content/testbank.sample.json";
import { auth, profiles, progress, tests, signoffs, certs, activity } from "./lib/api";

/* ── brand tokens (exact from deck XML) ── */
const B = {
  navy:    "#2C3D8F",
  deep:    "#1B2566",
  ink:     "#171C3D",
  lime:    "#D4FF00",
  red:     "#FF3C50",
  slate:   "#565C82",
  mute:    "#8B93C4",
  intro:   "#D4D9F5",
  tag:     "#AEB6E2",
  white:   "#FFFFFF",
};

/* ── role hierarchy ── */
const ROLES = {
  super_admin:   { label: "Super Admin",              can: ["all"] },
  venue_manager: { label: "Venue Manager",            can: ["view_all","manage_venue"] },
  assistant_vm:  { label: "Assistant Venue Manager",  can: ["view_all"] },
  track_manager: { label: "Track Manager",            can: ["create_trainee","signoff_1_3"] },
  assistant_tm:  { label: "Assistant Track Manager",  can: ["create_trainee","signoff_1_3"] },
  trainee:       { label: "Trainee",                  can: [] },
};
const isStaff  = (r) => ["super_admin","venue_manager","assistant_vm","track_manager","assistant_tm"].includes(r);
const canCreate= (r) => ["super_admin","track_manager","assistant_tm"].includes(r);
const canView  = (r) => ["super_admin","venue_manager","assistant_vm"].includes(r);
const canSignoff=(r) => ["super_admin","track_manager","assistant_tm"].includes(r);

const LEVELS = curriculum.levels;
const ICONS  = { trainee: Shield, rookie: Flag, rally: Award, wrc: Crown, champion: Trophy, gmac: Star };
const modId  = (lk, code) => `${lk}-${code}`;
const allMods= (lvl) => lvl.phases.flatMap(p => p.modules.map(m => ({ ...m, id: modId(lvl.key, m.code), phase: p.phase })));
const fmt    = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString("en-AU",{hour:"numeric",minute:"2-digit"}); };
const certCount = (u, d) => LEVELS.filter(l => d?.cert?.[l.key]).length;
const rankName  = (u, d) => { const n = certCount(u, d); return n === 0 ? "Trainee" : LEVELS[n-1].name; };

/* ══════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════ */
export default function App() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [booted,  setBooted]  = useState(false);
  const [screen,  setScreen]  = useState("loading");
  const [ctx,     setCtx]     = useState({});
  const [toast,   setToast]   = useState(null);

  const flash = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  useEffect(() => {
    const { data: sub } = auth.onChange(async u => {
      setUser(u);
      if (u) { const p = await profiles.me(); setProfile(p); setScreen(p ? "dash" : "create_profile"); }
      else { setProfile(null); setScreen("signin"); }
      setBooted(true);
    });
    (async () => {
      const u = await auth.getUser(); setUser(u);
      if (u) { const p = await profiles.me(); setProfile(p); setScreen(p ? "dash" : "create_profile"); }
      else setScreen("signin");
      setBooted(true);
    })();
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const go = (s, c={}) => { setCtx(c); setScreen(s); };

  if (!booted || screen === "loading") return <Splash />;

  return (
    <div style={{ minHeight:"100%", background: B.ink, color: B.white, fontFamily:"Arial,Helvetica,sans-serif" }}>
      {screen === "signin"         && <SignIn />}
      {screen === "create_profile" && <CreateProfile user={user} onDone={async()=>{ const p=await profiles.me(); setProfile(p); setScreen("dash"); }} />}
      {screen === "dash"           && profile && <Dashboard profile={profile} go={go} flash={flash} />}
      {screen === "module"         && profile && <ModuleScreen profile={profile} ctx={ctx} go={go} flash={flash} />}
      {screen === "test"           && profile && <TestScreen profile={profile} ctx={ctx} go={go} flash={flash} />}
      {screen === "roster"         && profile && <Roster profile={profile} go={go} flash={flash} />}
      {screen === "person"         && profile && <PersonDetail profile={profile} ctx={ctx} go={go} flash={flash} />}
      {screen === "invite"         && profile && <InviteTrainee profile={profile} go={go} flash={flash} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}

/* ── splash ── */
const Splash = () => (
  <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${B.deep} 0%,${B.ink} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <div style={{fontSize:28,fontWeight:900,letterSpacing:6,color:B.lime}}>POWERPLAY</div>
    <div style={{fontSize:12,letterSpacing:3,color:B.mute}}>ACADEMY</div>
    <div style={{width:32,height:2,background:B.lime,marginTop:8,borderRadius:2}} />
  </div>
);

/* ── shell ── */
function Shell({ profile, go, children, plain }) {
  const [open, setOpen] = useState(false);
  const staff = profile && isStaff(profile.role);
  const creator = profile && canCreate(profile.role);
  const viewer = profile && canView(profile.role);

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse 140% 70% at 80% -10%,${B.navy} 0%,${B.deep} 45%,${B.ink} 100%)`}}>
      {/* top bar */}
      <div style={{position:"sticky",top:0,zIndex:40,backdropFilter:"blur(12px)",background:"rgba(23,28,61,.88)",borderBottom:`1px solid rgba(255,255,255,.07)`}}>
        <div style={{maxWidth:1080,margin:"0 auto",padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>go("dash")} style={bareBtn}>
            <span style={{fontWeight:900,letterSpacing:5,fontSize:16,color:B.lime}}>POWERPLAY</span>
            <span style={{fontSize:10,letterSpacing:3,color:B.mute,marginLeft:8}}>ACADEMY</span>
          </button>
          {/* desktop nav */}
          <div className="desktop-nav" style={{display:"flex",alignItems:"center",gap:8}}>
            {creator && <NavBtn icon={<UserPlus size={15}/>} label="Add trainee" onClick={()=>go("invite")} />}
            {(staff||viewer) && <NavBtn icon={<Eye size={15}/>} label="Roster" onClick={()=>go("roster")} />}
            {profile && <RolePill role={profile.role} />}
            {profile && <NavBtn icon={<LogOut size={15}/>} label="" onClick={()=>auth.signOut()} title="Sign out" />}
          </div>
          {/* mobile hamburger */}
          <button onClick={()=>setOpen(o=>!o)} style={{...bareBtn,display:"none"}} className="mobile-menu-btn" aria-label="Menu">
            <Menu size={22} color={B.mute} />
          </button>
        </div>
        {/* mobile dropdown */}
        {open && (
          <div style={{borderTop:`1px solid rgba(255,255,255,.07)`,padding:12,display:"flex",flexDirection:"column",gap:8}} className="mobile-menu">
            {creator && <MobileNavItem icon={<UserPlus size={15}/>} label="Add trainee" onClick={()=>{go("invite");setOpen(false);}} />}
            {(staff||viewer) && <MobileNavItem icon={<Eye size={15}/>} label="Roster" onClick={()=>{go("roster");setOpen(false);}} />}
            {profile && <div style={{padding:"4px 0"}}><RolePill role={profile.role} /></div>}
            <MobileNavItem icon={<LogOut size={15}/>} label="Sign out" onClick={()=>auth.signOut()} />
          </div>
        )}
      </div>
      <div style={{maxWidth:1080,margin:"0 auto",padding:"28px 20px 80px"}}>
        {children}
      </div>
      <style>{`
        @media(min-width:640px){.desktop-nav{display:flex!important}.mobile-menu-btn{display:none!important}.mobile-menu{display:none!important}}
        @media(max-width:639px){.desktop-nav{display:none!important}.mobile-menu-btn{display:flex!important}}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}
const bareBtn = { background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,padding:"6px 8px",borderRadius:8,color:B.white };
const NavBtn = ({ icon, label, onClick, title }) => (
  <button onClick={onClick} title={title||label} style={{...bareBtn,fontSize:13,color:B.mute,gap:6,"&:hover":{color:B.white}}}>
    {icon}{label && <span style={{fontSize:12,fontWeight:700}}>{label}</span>}
  </button>
);
const MobileNavItem = ({ icon, label, onClick }) => (
  <button onClick={onClick} style={{...bareBtn,justifyContent:"flex-start",padding:"10px 8px",fontSize:14,color:B.intro,width:"100%"}}>
    {icon}<span>{label}</span>
  </button>
);
const RolePill = ({ role }) => (
  <span style={{fontSize:10,fontWeight:800,letterSpacing:1.5,padding:"3px 10px",borderRadius:99,background:"rgba(212,255,0,.12)",color:B.lime,textTransform:"uppercase"}}>
    {ROLES[role]?.label || role}
  </span>
);

/* ── sign in ── */
function SignIn() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse 140% 70% at 80% -10%,${B.navy} 0%,${B.deep} 45%,${B.ink} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{marginBottom:40,textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:6,color:B.lime,marginBottom:4}}>POWERPLAY</div>
          <div style={{fontSize:11,letterSpacing:4,color:B.mute}}>THE ACADEMY</div>
        </div>
        {sent ? (
          <Card>
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <Check size={32} color={B.lime} style={{marginBottom:12}} />
              <div style={{fontWeight:800,fontSize:18,marginBottom:8}}>Check your email.</div>
              <div style={{color:B.intro,fontSize:14,lineHeight:1.6}}>We sent a sign-in link to <b>{email}</b>. Click it and you're in.</div>
            </div>
          </Card>
        ) : (
          <Card>
            <Label>Your email</Label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@powerplay.com" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&email&&auth.signInWithEmail(email).then(()=>setSent(true))} />
            <LimeBtn disabled={!email} onClick={()=>auth.signInWithEmail(email).then(()=>setSent(true))} style={{marginTop:12}}>Send sign-in link</LimeBtn>
            <div style={{marginTop:16,fontSize:12,color:B.mute,textAlign:"center",lineHeight:1.6}}>Your account is created by your Track Manager.<br />First time? Ask them to set you up.</div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── create profile (first sign-in) ── */
function CreateProfile({ user, onDone }) {
  const [f, setF] = useState({ full_name:"", email:user?.email||"", venue:"" });
  const ok = f.full_name.trim();
  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse 140% 70% at 80% -10%,${B.navy} 0%,${B.deep} 45%,${B.ink} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <Eyebrow>Level 1 · Trainee</Eyebrow>
        <PageTitle>Start your climb.</PageTitle>
        <PageSub style={{marginBottom:24}}>Your record is created now. Every module, test and sign-off is dated and saved here permanently.</PageSub>
        <Card>
          {[["full_name","Full name","Jordan Smith"],["email","Email","jordan@powerplay.com"],["venue","Venue (optional)","Perth"]].map(([k,l,ph])=>(
            <div key={k} style={{marginBottom:14}}>
              <Label>{l}</Label>
              <input value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <LimeBtn disabled={!ok} onClick={()=>profiles.create(f).then(onDone)}>Begin training</LimeBtn>
        </Card>
      </div>
    </div>
  );
}

/* ── dashboard ── */
function Dashboard({ profile, go, flash }) {
  const [d, setD] = useState(null);
  const refresh = useCallback(async () => {
    const [learned, signs, cert, attempts, log] = await Promise.all([
      progress.learnedFor(profile.id), signoffs.forProfile(profile.id),
      certs.forProfile(profile.id), tests.attemptsFor(profile.id), activity.forProfile(profile.id),
    ]);
    const passed = {}; attempts.forEach(a=>{ if(a.passed) passed[a.level_key]=a; });
    setD({ learned, signs, cert, passed, log });
  }, [profile.id]);
  useEffect(()=>{ refresh(); },[refresh]);

  const [showLog, setShowLog] = useState(false);

  if (!d) return <Shell profile={profile} go={go}><Loading /></Shell>;

  const cc = certCount(profile, d);
  const activeIdx = Math.min(cc, LEVELS.length-1);
  const aLevel = LEVELS[activeIdx];
  const mods = allMods(aLevel);
  const modsDone = mods.filter(m=>d.learned[m.id]).length;
  const testPassed = !!d.passed[aLevel.key];
  const signedCount = mods.filter(m=>d.signs[m.id]?.outcome==="competent").length;
  const isCert = !!d.cert[aLevel.key];

  return (
    <Shell profile={profile} go={go}>
      {/* hero */}
      <div style={{marginBottom:32}}>
        <Eyebrow>{profile.venue || "PowerPlay"}</Eyebrow>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <PageTitle style={{marginBottom:0}}>Hey {profile.full_name.split(" ")[0]}.</PageTitle>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,letterSpacing:2,color:B.mute}}>CURRENT RANK</div>
            <div style={{fontSize:22,fontWeight:900,color:B.lime,letterSpacing:1}}>{rankName(profile,d)}</div>
          </div>
        </div>
      </div>

      {/* ladder */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12,marginBottom:28,scrollbarWidth:"none"}}>
        {LEVELS.map((l,i)=>{
          const Icon=ICONS[l.key]||Star; const cert=!!d.cert[l.key]; const active=i===activeIdx&&!cert; const locked=i>cc;
          return (
            <div key={l.key} style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:99,
              background:cert?B.lime:active?"rgba(212,255,0,.12)":"rgba(255,255,255,.05)",
              border:`1px solid ${cert?B.lime:active?B.lime:"rgba(255,255,255,.08)"}`,
              color:cert?B.ink:active?B.lime:B.mute,opacity:locked?.5:1}}>
              {cert?<Check size={13}/>:locked?<Lock size={12}/>:<Icon size={13}/>}
              <span style={{fontSize:11,fontWeight:800,letterSpacing:.5}}>{l.name.toUpperCase()}</span>
            </div>
          );
        })}
      </div>

      {/* two-column on desktop */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20}}>
        {/* left: current level modules */}
        <div>
          <SectionLabel icon="◆" text={`${aLevel.name} · ${isCert?"Certified":"In progress"}`} />
          <div style={{fontSize:12,color:B.mute,marginBottom:14}}>{aLevel.duration} · Sign-off: {aLevel.signoffAuthority}</div>

          {aLevel.phases.map(ph=>(
            <div key={ph.phase} style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:2,color:B.slate,marginBottom:8,textTransform:"uppercase"}}>{ph.phase}</div>
              <div style={{display:"grid",gap:6}}>
                {ph.modules.map(m=>{
                  const id=modId(aLevel.key,m.code); const done=d.learned[id]; const sign=d.signs[id];
                  return (
                    <button key={id} onClick={()=>go("module",{mod:{...m,id,phase:ph.phase},levelKey:aLevel.key})}
                      style={{display:"flex",alignItems:"center",gap:10,textAlign:"left",padding:"11px 14px",borderRadius:12,
                        border:`1px solid ${done?"rgba(26,143,76,.3)":"rgba(255,255,255,.08)"}`,
                        background:done?"rgba(26,143,76,.08)":"rgba(255,255,255,.04)",cursor:"pointer",width:"100%"}}>
                      {done?<Check size={16} color="#1a8f4c"/>:<Circle size={16} color={B.slate}/>}
                      <span style={{flex:1,fontSize:14,fontWeight:600,color:done?"#8eedb4":B.intro}}>{m.title}</span>
                      {sign?.outcome==="competent"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(26,143,76,.2)",color:"#1a8f4c"}}>SIGNED</span>}
                      {done&&!sign&&<span style={{fontSize:11,color:B.mute}}>{fmt(done).split(" · ")[0]}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* right: test + sign-off + progress */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* test card */}
          <div style={{borderRadius:16,padding:20,border:`1px solid ${testPassed?"rgba(212,255,0,.25)":"rgba(255,255,255,.08)"}`,background:testPassed?"rgba(212,255,0,.06)":"rgba(255,255,255,.04)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontWeight:800,fontSize:15}}>Knowledge test</span>
              {testPassed?<StatusBadge ok>{d.passed[aLevel.key].score}%</StatusBadge>:<StatusBadge>Not done</StatusBadge>}
            </div>
            <div style={{fontSize:12,color:B.mute,marginBottom:14,lineHeight:1.6}}>100% on safety questions · 90% overall to pass.</div>
            <LimeBtn disabled={modsDone<mods.length} onClick={()=>go("test",{levelKey:aLevel.key})} small>
              {testPassed?"Retake test":modsDone>=mods.length?"Take the test":"Finish all modules first"}
            </LimeBtn>
          </div>

          {/* practical */}
          <div style={{borderRadius:16,padding:20,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.04)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontWeight:800,fontSize:15}}>Practical sign-off</span>
              <StatusBadge ok={signedCount===mods.length&&mods.length>0}>{signedCount}/{mods.length} modules</StatusBadge>
            </div>
            <div style={{fontSize:12,color:B.mute,lineHeight:1.6}}>Your {aLevel.signoffAuthority} signs off each module on the floor after observing you. Test passed + all modules signed = certified.</div>
          </div>

          {/* activity log */}
          <div style={{borderRadius:16,border:"1px solid rgba(255,255,255,.07)"}}>
            <button onClick={()=>setShowLog(s=>!s)} style={{...bareBtn,width:"100%",justifyContent:"space-between",padding:"14px 16px",color:B.intro}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Clock size={14} color={B.lime}/><span style={{fontSize:13,fontWeight:700}}>Activity log</span>
              </div>
              <ChevronRight size={16} color={B.mute} style={{transform:showLog?"rotate(90deg)":"none",transition:"transform .2s"}} />
            </button>
            {showLog&&(
              <div style={{padding:"0 16px 16px"}}>
                {d.log.length===0?<div style={{fontSize:13,color:B.mute}}>No activity yet.</div>:
                  d.log.slice(0,8).map((h,i)=>(
                    <div key={h.id||i} style={{display:"flex",gap:10,padding:"8px 0",borderTop:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{width:6,height:6,borderRadius:99,background:B.lime,marginTop:6,flexShrink:0}}/>
                      <div><div style={{fontSize:13,color:B.intro}}>{h.text}</div><div style={{fontSize:11,color:B.mute,marginTop:2}}>{fmt(h.at)}</div></div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── module screen ── */
function ModuleScreen({ profile, ctx, go, flash }) {
  const { mod, levelKey } = ctx;
  const level = LEVELS.find(l=>l.key===levelKey);
  const [done, setDone] = useState(false);
  const [ack, setAck] = useState(false);
  useEffect(()=>{ (async()=>{ const l=await progress.learnedFor(profile.id); setDone(!!l[mod.id]); setAck(!!l[mod.id]); })(); },[mod.id,profile.id]);
  const complete = async () => {
    await progress.markLearned(profile.id, mod.id, `${level.name}: ${mod.title}`);
    flash("Module complete — keep climbing."); go("dash");
  };
  return (
    <Shell profile={profile} go={go}>
      <BackBtn onClick={()=>go("dash")} />
      <Eyebrow>{level.name} · {mod.phase}</Eyebrow>
      <PageTitle>{mod.title}</PageTitle>
      <div style={{maxWidth:640}}>
        <div style={{borderRadius:16,padding:24,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",marginBottom:20}}>
          {(mod.content||[]).filter(Boolean).slice(0,30).map((p,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:12,fontSize:15,lineHeight:1.7,color:B.intro}}>
              <span style={{color:B.red,flexShrink:0,marginTop:2}}>◆</span><span>{p}</span>
            </div>
          ))}
        </div>
        {done?<div style={{display:"flex",alignItems:"center",gap:8,color:"#1a8f4c",fontWeight:700}}><Check size={18}/>Completed — {fmt(done).split(" · ")[0]}</div>:(
          <>
            <label style={{display:"flex",gap:10,cursor:"pointer",marginBottom:16}}>
              <input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} style={{marginTop:3}}/>
              <span style={{fontSize:14,color:B.intro}}>I've read and understood this module.</span>
            </label>
            <LimeBtn disabled={!ack} onClick={complete}>Mark complete</LimeBtn>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ── test screen ── */
function TestScreen({ profile, ctx, go, flash }) {
  const { levelKey } = ctx;
  const level = LEVELS.find(l=>l.key===levelKey);
  const [qs, setQs] = useState(null);
  const [ans, setAns] = useState({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(()=>{ (async()=>{ let q=await tests.questions(levelKey); if(!q.length) q=(sampleBank[levelKey]||[]).map((x,i)=>({id:i,...x})); setQs(q); })(); },[levelKey]);
  if (!qs) return <Shell profile={profile} go={go}><Loading /></Shell>;

  const total  = qs.length;
  const correct= qs.filter((q,i)=>ans[i]===q.correct_index).length;
  const safetyOk=qs.filter(q=>q.is_safety).every(q=>ans[qs.indexOf(q)]===q.correct_index);
  const pct    = total?Math.round((correct/total)*100):0;
  const passed = pct>=90&&safetyOk;
  const all    = Object.keys(ans).length===total;

  const save = async () => {
    await tests.saveAttempt(profile.id, levelKey, {score:pct,safetyOk,passed}, level.name);
    flash(passed?"Test passed — get your practical signed off.":"Not quite — try again."); go("dash");
  };

  return (
    <Shell profile={profile} go={go}>
      <BackBtn onClick={()=>go("dash")} />
      <Eyebrow>{level.name} · Online test</Eyebrow>
      <PageTitle style={{marginBottom:4}}>Prove you know it.</PageTitle>
      <PageSub style={{marginBottom:24}}>100% on <span style={{color:B.red,fontWeight:700}}>safety questions</span> · 90% overall.</PageSub>
      <div style={{display:"grid",gap:14,maxWidth:680}}>
        {qs.map((q,i)=>(
          <div key={i} style={{borderRadius:14,padding:20,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)"}}>
            <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-start"}}>
              <span style={{fontWeight:900,color:B.lime,fontSize:16,flexShrink:0}}>{i+1}.</span>
              <span style={{fontWeight:700,fontSize:15,lineHeight:1.5,flex:1}}>{q.question}</span>
              {q.is_safety&&<span style={{fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:99,background:B.red,color:B.white,flexShrink:0,letterSpacing:.5}}>SAFETY</span>}
            </div>
            <div style={{display:"grid",gap:8}}>
              {q.options.map((opt,oi)=>{
                const chosen=ans[i]===oi,right=submitted&&oi===q.correct_index,wrong=submitted&&chosen&&oi!==q.correct_index;
                return (
                  <button key={oi} disabled={submitted} onClick={()=>setAns(a=>({...a,[i]:oi}))}
                    style={{display:"flex",alignItems:"center",gap:10,textAlign:"left",fontSize:14,padding:"10px 14px",borderRadius:10,width:"100%",cursor:submitted?"default":"pointer",
                      border:`1px solid ${right?"#1a8f4c":wrong?B.red:chosen?B.lime:"rgba(255,255,255,.1)"}`,
                      background:right?"rgba(26,143,76,.12)":wrong?"rgba(255,60,80,.1)":chosen?"rgba(212,255,0,.08)":"rgba(255,255,255,.03)",
                      color:B.white}}>
                    {chosen?<Check size={15} color={right?"#1a8f4c":wrong?B.red:B.lime}/>:<Circle size={15} color={B.slate}/>}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!submitted?(
          <LimeBtn disabled={!all} onClick={()=>setSubmitted(true)}>{all?"Submit test":"Answer all questions first"}</LimeBtn>
        ):(
          <div style={{borderRadius:16,padding:24,background:passed?"rgba(212,255,0,.1)":"rgba(255,60,80,.08)",border:`1px solid ${passed?"rgba(212,255,0,.3)":"rgba(255,60,80,.3)"}`,textAlign:"center"}}>
            <div style={{fontSize:40,fontWeight:900,color:passed?B.lime:B.red,marginBottom:4}}>{pct}%</div>
            <div style={{fontSize:14,color:B.intro,marginBottom:4}}>{correct}/{total} correct · safety {safetyOk?"100%":"incomplete"}</div>
            {passed?(
              <><div style={{color:"#8eedb4",fontSize:14,marginBottom:16}}>Test passed. Now get your practical signed off to certify.</div><LimeBtn onClick={save}>Save and continue</LimeBtn></>
            ):(
              <><div style={{color:B.red,fontSize:14,marginBottom:16}}>{safetyOk?"You need 90% overall.":"Every safety question must be correct."}</div>
              <button onClick={()=>{setSubmitted(false);setAns({});}} style={{...bareBtn,border:`1px solid ${B.red}`,color:B.red,padding:"10px 24px",borderRadius:10,fontSize:14,fontWeight:700}}>Try again</button></>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ── roster (venue manager / admin view) ── */
function Roster({ profile, go, flash }) {
  const [people, setPeople] = useState(null);
  const [q, setQ] = useState("");
  useEffect(()=>{ (async()=>{ const {data}=await profiles.list(); setPeople(data||[]); })(); },[]);
  const list=(people||[]).filter(u=>!q||(u.full_name+(u.email||"")+(u.venue||"")).toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell profile={profile} go={go}>
      <BackBtn onClick={()=>go("dash")} />
      <PageTitle>The team.</PageTitle>
      <PageSub style={{marginBottom:20}}>Everyone in the Academy. Open a person to review their progress{canSignoff(profile.role)?" and sign off modules":""}.</PageSub>
      <div style={{position:"relative",marginBottom:16}}>
        <Search size={16} color={B.mute} style={{position:"absolute",left:14,top:12}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, email or venue…" style={{...inputStyle,paddingLeft:42}}/>
      </div>
      {people===null?<Loading/>:list.length===0?<Empty>No one found.</Empty>:(
        <div style={{display:"grid",gap:8}}>
          {list.map(u=>(
            <button key={u.id} onClick={()=>go("person",{person:u})} style={{display:"flex",alignItems:"center",gap:14,textAlign:"left",padding:"14px 16px",borderRadius:14,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.04)",cursor:"pointer",width:"100%"}}>
              <Avatar name={u.full_name}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,color:B.white,marginBottom:2}}>{u.full_name}</div>
                <div style={{fontSize:12,color:B.mute}}>{ROLES[u.role]?.label||u.role}{u.venue?" · "+u.venue:""}</div>
              </div>
              <ChevronRight size={16} color={B.slate}/>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ── person detail (assessor signs off here) ── */
function PersonDetail({ profile, ctx, go, flash }) {
  const { person } = ctx;
  const [d, setD] = useState(null);
  const canSign = canSignoff(profile.role);
  const refresh = useCallback(async()=>{
    const [learned,signs,cert,attempts,log]=await Promise.all([
      progress.learnedFor(person.id),signoffs.forProfile(person.id),
      certs.forProfile(person.id),tests.attemptsFor(person.id),activity.forProfile(person.id),
    ]);
    const passed={}; attempts.forEach(a=>{if(a.passed)passed[a.level_key]=a;});
    setD({learned,signs,cert,passed,log});
  },[person.id]);
  useEffect(()=>{refresh();},[refresh]);

  const signOff = async (level,m,outcome)=>{
    const initials=window.prompt(`Your initials — signing "${m.title}" as ${outcome==="competent"?"competent":"not yet"}:`,"");
    if(initials===null) return;
    await signoffs.sign({profileId:person.id,moduleId:m.id,outcome,assessorName:profile.full_name,initials,label:`${level.name}: ${m.title}`});
    await refresh();
    flash(outcome==="competent"?"Signed off as competent.":"Marked not yet competent.");
  };
  const certify = async(level)=>{
    await certs.certify(person.id,level.key,profile.full_name,level.name);
    await refresh(); flash(`${person.full_name.split(" ")[0]} is now certified — ${level.name}.`);
  };

  if(!d) return <Shell profile={profile} go={go}><Loading/></Shell>;

  return (
    <Shell profile={profile} go={go}>
      <BackBtn onClick={()=>go("roster")} />
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
        <Avatar name={person.full_name} size={52}/>
        <div>
          <PageTitle style={{marginBottom:2}}>{person.full_name}</PageTitle>
          <div style={{fontSize:13,color:B.mute}}>{ROLES[person.role]?.label||person.role}{person.venue?" · "+person.venue:""} · {person.email}</div>
        </div>
      </div>
      <div style={{marginBottom:28,display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:13,color:B.mute}}>Rank:</div>
        <div style={{fontWeight:800,color:B.lime}}>{rankName(person,d)}</div>
      </div>

      <div style={{display:"grid",gap:16,maxWidth:760}}>
        {LEVELS.map(level=>{
          const mods=allMods(level);
          const signed=mods.filter(m=>d.signs[m.id]?.outcome==="competent").length;
          const testPassed=!!d.passed[level.key];
          const certified=!!d.cert[level.key];
          const canCertify=testPassed&&signed===mods.length&&mods.length>0&&!certified&&canSign;
          return (
            <div key={level.key} style={{borderRadius:16,border:`1px solid ${certified?"rgba(212,255,0,.2)":"rgba(255,255,255,.08)"}`,background:certified?"rgba(212,255,0,.04)":"rgba(255,255,255,.03)",overflow:"hidden"}}>
              <div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {React.createElement(ICONS[level.key]||Star,{size:16,color:B.lime})}
                  <span style={{fontWeight:800,fontSize:16}}>{level.name}</span>
                  <span style={{fontSize:12,color:B.mute}}>· {level.signoffAuthority}</span>
                </div>
                {certified?<StatusBadge ok>Certified</StatusBadge>:<StatusBadge>{signed}/{mods.length} · test {testPassed?"✓":"—"}</StatusBadge>}
              </div>
              <div style={{padding:"12px 20px"}}>
                {mods.map(m=>{
                  const s=d.signs[m.id]; const learned=d.learned[m.id];
                  return (
                    <div key={m.id} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:13,fontWeight:600,color:B.intro}}>{m.title}</span>
                        {s?<span style={{fontSize:11,color:s.outcome==="competent"?"#1a8f4c":B.red}}>{s.outcome==="competent"?"✓":"✗"} {s.assessor_name} ({s.initials}) · {fmt(s.signed_at).split(" · ")[0]}</span>
                          :<span style={{fontSize:11,color:B.mute}}>{learned?"Learned · awaiting sign-off":"Not started"}</span>}
                      </div>
                      {(m.practicalCriteria||[]).length>0&&(
                        <ul style={{margin:"6px 0 0",paddingLeft:0,listStyle:"none"}}>
                          {m.practicalCriteria.map((c,i)=><li key={i} style={{fontSize:11,color:B.slate,marginBottom:2}}>☐ {c}</li>)}
                        </ul>
                      )}
                      {canSign&&!s&&(
                        <div style={{display:"flex",gap:8,marginTop:8}}>
                          <button onClick={()=>signOff(level,m,"competent")} style={{fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:8,background:B.red,color:B.white,border:"none",cursor:"pointer"}}>Sign off</button>
                          <button onClick={()=>signOff(level,m,"not_yet")} style={{fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:8,background:"rgba(255,255,255,.08)",color:B.mute,border:"none",cursor:"pointer"}}>Not yet</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {canCertify&&<div style={{padding:"12px 20px",borderTop:"1px solid rgba(212,255,0,.15)"}}><LimeBtn onClick={()=>certify(level)} small>Certify {level.name} — {person.full_name.split(" ")[0]}</LimeBtn></div>}
            </div>
          );
        })}
      </div>

      <div style={{marginTop:28}}>
        <SectionLabel icon="◆" text="Full dated log"/>
        <div style={{borderRadius:14,border:"1px solid rgba(255,255,255,.07)",padding:16,marginTop:12}}>
          {d.log.length===0?<div style={{fontSize:13,color:B.mute}}>No activity yet.</div>:
            d.log.map((h,i)=>(
              <div key={h.id||i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <div style={{width:6,height:6,borderRadius:99,background:B.lime,marginTop:6,flexShrink:0}}/>
                <div><div style={{fontSize:13,color:B.intro}}>{h.text}</div><div style={{fontSize:11,color:B.mute,marginTop:2}}>{fmt(h.at)}</div></div>
              </div>
            ))
          }
        </div>
      </div>
    </Shell>
  );
}

/* ── invite trainee (TM / ATM only) ── */
function InviteTrainee({ profile, go, flash }) {
  const [f, setF] = useState({ full_name:"", email:"", venue: profile.venue||"" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const ok = f.full_name.trim() && f.email.trim();

  const invite = async () => {
    setSending(true);
    const { error } = await auth.signInWithEmail(f.email);
    if (!error) {
      await profiles.createForOther({ ...f, role:"trainee", created_by: profile.id });
      setDone(true); flash("Invite sent to "+f.email);
    } else { flash("Could not send invite — check the email address.","err"); }
    setSending(false);
  };

  return (
    <Shell profile={profile} go={go}>
      <BackBtn onClick={()=>go("dash")} />
      <Eyebrow>Track Manager · {profile.venue||"PowerPlay"}</Eyebrow>
      <PageTitle>Add a new trainee.</PageTitle>
      <PageSub style={{marginBottom:24}}>They'll get a sign-in link by email. Their record is created immediately — they log in and start from Level 1.</PageSub>
      <div style={{maxWidth:420}}>
        {done?(
          <Card>
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <Check size={32} color={B.lime} style={{marginBottom:12}}/>
              <div style={{fontWeight:800,fontSize:18,marginBottom:8}}>Invite sent.</div>
              <div style={{color:B.intro,fontSize:14,lineHeight:1.6,marginBottom:20}}>A sign-in link has gone to <b>{f.email}</b>. When they click it, they land straight in the Academy as a Trainee.</div>
              <LimeBtn onClick={()=>{setDone(false);setF({full_name:"",email:"",venue:profile.venue||""});}}>Add another</LimeBtn>
            </div>
          </Card>
        ):(
          <Card>
            {[["full_name","Full name","Jordan Smith"],["email","Email address","jordan@powerplay.com"],["venue","Venue","Perth"]].map(([k,l,ph])=>(
              <div key={k} style={{marginBottom:14}}>
                <Label>{l}</Label>
                <input value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})} placeholder={ph} style={inputStyle}/>
              </div>
            ))}
            <LimeBtn disabled={!ok||sending} onClick={invite}>{sending?"Sending…":"Send invite"}</LimeBtn>
          </Card>
        )}
      </div>
    </Shell>
  );
}

/* ── shared ui atoms ── */
const Card = ({ children, style }) => <div style={{borderRadius:16,padding:24,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",...style}}>{children}</div>;
const Label = ({ children }) => <div style={{fontSize:12,fontWeight:700,letterSpacing:.5,color:B.mute,marginBottom:6,textTransform:"uppercase"}}>{children}</div>;
const PageTitle = ({ children, style }) => <h1 style={{fontSize:34,fontWeight:900,lineHeight:1.1,letterSpacing:-.5,margin:"4px 0 8px",...style}}>{children}</h1>;
const PageSub = ({ children, style }) => <p style={{fontSize:15,color:B.intro,lineHeight:1.7,margin:"0 0 16px",...style}}>{children}</p>;
const Eyebrow = ({ children }) => <div style={{fontSize:11,fontWeight:800,letterSpacing:3,color:B.lime,textTransform:"uppercase",marginBottom:6}}>{children}</div>;
const SectionLabel = ({ icon, text }) => <div style={{fontSize:11,fontWeight:800,letterSpacing:2,color:B.lime,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6,marginBottom:8}}><span style={{color:B.red}}>{icon}</span>{text}</div>;
const BackBtn = ({ onClick }) => <button onClick={onClick} style={{...bareBtn,color:B.mute,marginBottom:20,padding:"4px 0"}}><ChevronLeft size={16}/><span style={{fontSize:13}}>Back</span></button>;
const Loading = () => <div style={{color:B.mute,padding:40,textAlign:"center"}}>Loading…</div>;
const Empty = ({ children }) => <div style={{color:B.mute,fontSize:14,padding:24,textAlign:"center",borderRadius:12,border:"1px dashed rgba(255,255,255,.1)"}}>{children}</div>;
const Toast = ({ toast }) => <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:99,display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:99,background:toast.type==="err"?B.red:B.lime,color:toast.type==="err"?B.white:B.ink,fontWeight:700,fontSize:14,boxShadow:"0 4px 24px rgba(0,0,0,.4)",whiteSpace:"nowrap"}}>{toast.type==="err"?<AlertCircle size={16}/>:<Check size={16}/>}{toast.msg}</div>;
const StatusBadge = ({ children, ok }) => <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:ok?"rgba(26,143,76,.2)":"rgba(255,255,255,.08)",color:ok?"#1a8f4c":B.mute}}>{children}</span>;
const Avatar = ({ name, size=40 }) => <div style={{width:size,height:size,borderRadius:99,background:`rgba(44,61,143,.6)`,border:`1px solid ${B.lime}22`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:size*.35,color:B.lime,flexShrink:0}}>{(name||"?").slice(0,1).toUpperCase()}</div>;
const LimeBtn = ({ children, disabled, onClick, small, style }) => <button disabled={disabled} onClick={onClick} style={{display:"block",width:small?"auto":"100%",padding:small?"9px 20px":"12px 20px",borderRadius:10,background:disabled?"rgba(255,255,255,.08)":B.lime,color:disabled?B.slate:B.ink,fontWeight:800,fontSize:small?13:15,border:"none",cursor:disabled?"default":"pointer",letterSpacing:.3,...style}}>{children}</button>;
const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, fontSize:14, border:"1px solid rgba(255,255,255,.12)", outline:"none", background:"rgba(255,255,255,.06)", color:B.white, fontFamily:"Arial,Helvetica,sans-serif" };
