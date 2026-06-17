// Seeds reference data (levels, modules, practical criteria) from curriculum.json.
// Usage:  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/seed.mjs
// Use the SERVICE ROLE key (server-side only) so RLS doesn't block the seed.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY"); process.exit(1); }
const sb = createClient(url, key);
const data = JSON.parse(readFileSync(new URL("../src/content/curriculum.json", import.meta.url)));

const levels = [], modules = [], criteria = [];
for (const L of data.levels) {
  levels.push({ key: L.key, name: L.name, ord: L.order, duration: L.duration, signoff_authority: L.signoffAuthority });
  let ord = 0;
  for (const ph of L.phases) for (const m of ph.modules) {
    const id = `${L.key}-${m.code}`;
    modules.push({ id, level_key: L.key, phase: ph.phase, code: m.code, title: m.title, ord: ord++ });
    for (const c of (m.practicalCriteria || [])) criteria.push({ module_id: id, text: c });
  }
}
const up = async (t, rows, conflict) => {
  const { error } = await sb.from(t).upsert(rows, conflict ? { onConflict: conflict } : {});
  console.log(error ? `${t}: ERROR ${error.message}` : `${t}: ${rows.length} rows`);
};
await up("levels", levels, "key");
await up("modules", modules, "id");
// replace criteria cleanly
await sb.from("module_criteria").delete().neq("id", -1);
await up("module_criteria", criteria);
console.log("Seed complete. NOTE: author test_questions per level separately (see DEVELOPER_BRIEF).");
