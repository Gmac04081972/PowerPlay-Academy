// Data layer for PowerPlay Academy.
// This is the ONLY file that talks to the backend. The UI calls these functions.
// (In the in-chat prototype these were window.storage calls; here they are Supabase.)
import { supabase } from "./supabase";

/* ---------- auth ---------- */
export const auth = {
  signInWithEmail: (email) => supabase.auth.signInWithOtp({ email }), // magic link
  signOut: () => supabase.auth.signOut(),
  getUser: async () => (await supabase.auth.getUser()).data.user,
  onChange: (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s?.user || null)),
};

/* ---------- profiles ---------- */
export const profiles = {
  me: async () => {
    const u = await auth.getUser(); if (!u) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    return data;
  },
  create: async ({ full_name, email, venue }) => {
    const u = await auth.getUser();
    const { data, error } = await supabase.from("profiles")
      .insert({ id: u.id, full_name, email, venue }).select().single();
    if (!error) await log(u.id, "Signed up and started training");
    return { data, error };
  },
  list: () => supabase.from("profiles").select("*").order("created_at", { ascending: false }),
  get: (id) => supabase.from("profiles").select("*").eq("id", id).single(),
};

/* ---------- progress ---------- */
export const progress = {
  markLearned: async (profileId, moduleId, label) => {
    const { error } = await supabase.from("module_progress")
      .upsert({ profile_id: profileId, module_id: moduleId }, { onConflict: "profile_id,module_id" });
    if (!error) await log(profileId, `Completed module · ${label}`);
    return { error };
  },
  learnedFor: async (profileId) => {
    const { data } = await supabase.from("module_progress").select("module_id,learned_at").eq("profile_id", profileId);
    return Object.fromEntries((data || []).map((r) => [r.module_id, r.learned_at]));
  },
};

/* ---------- tests ---------- */
export const tests = {
  questions: async (levelKey) => {
    const { data } = await supabase.from("test_questions").select("*").eq("level_key", levelKey);
    return data || [];
  },
  saveAttempt: async (profileId, levelKey, { score, safetyOk, passed }, levelName) => {
    await supabase.from("test_attempts").insert({ profile_id: profileId, level_key: levelKey, score, safety_ok: safetyOk, passed });
    if (passed) await log(profileId, `Passed the ${levelName} test (${score}%)`);
  },
  attemptsFor: async (profileId) => {
    const { data } = await supabase.from("test_attempts").select("*").eq("profile_id", profileId).order("attempted_at", { ascending: false });
    return data || [];
  },
};

/* ---------- sign-off (assessor) ---------- */
export const signoffs = {
  forProfile: async (profileId) => {
    const { data } = await supabase.from("practical_signoffs").select("*").eq("profile_id", profileId);
    return Object.fromEntries((data || []).map((r) => [r.module_id, r]));
  },
  sign: async ({ profileId, moduleId, outcome, assessorName, initials, notes, label }) => {
    const me = await auth.getUser();
    const { error } = await supabase.from("practical_signoffs").upsert({
      profile_id: profileId, module_id: moduleId, outcome,
      assessor_id: me?.id, assessor_name: assessorName, initials, notes,
    }, { onConflict: "profile_id,module_id" });
    if (!error) await log(profileId, `Practical ${outcome === "competent" ? "signed off" : "marked not yet"} by ${assessorName} · ${label}`);
    return { error };
  },
};

/* ---------- certifications ---------- */
export const certs = {
  forProfile: async (profileId) => {
    const { data } = await supabase.from("certifications").select("*").eq("profile_id", profileId);
    return Object.fromEntries((data || []).map((r) => [r.level_key, r]));
  },
  certify: async (profileId, levelKey, byName, levelName) => {
    const { error } = await supabase.from("certifications")
      .upsert({ profile_id: profileId, level_key: levelKey, by_name: byName }, { onConflict: "profile_id,level_key" });
    if (!error) await log(profileId, `Certified ${levelName} (by ${byName})`);
    return { error };
  },
};

/* ---------- activity log ---------- */
export async function log(profileId, text) {
  await supabase.from("activity_log").insert({ profile_id: profileId, text });
}
export const activity = {
  forProfile: async (profileId) => {
    const { data } = await supabase.from("activity_log").select("*").eq("profile_id", profileId).order("at", { ascending: false });
    return data || [];
  },
};
