# PowerPlay Academy — developer brief

## The product in one line
A sign-up → learn modules → online test → assessor practical sign-off portal that tracks each
person's progress through five certification levels, with everything dated.

## The certification rule (applies to every level)
A level is **certified** when BOTH are true:
1. **Online test passed** — pass = **100% on safety questions AND 90% overall**.
2. **Practical signed off** — each module's practical criteria observed and ticked, by the
   **authorised person for that level**:
   - Trainee, Rookie, Rally → **Track Manager**
   - WRC → **Senior Track Manager (State) and/or Daymon & GMac**
   - Champion → **Daymon & GMac only**
When a level is certified, the next rank unlocks.

## Data model (see `supabase/schema.sql`)
- **Reference (seeded from `curriculum.json`):** `levels`, `modules`, `module_criteria`, `test_questions`
- **People:** `profiles` (extends Supabase `auth.users`; `role` = trainee/assessor/manager/admin)
- **Progress (all dated):** `module_progress`, `test_attempts`, `practical_signoffs`,
  `certifications`, `activity_log`
- **View:** `v_level_status` gives per-person/per-level: modules_total, modules_signed,
  test_passed, certified.

## Security (already in schema)
- Trainees read/write only their own progress.
- Only **staff** (`role in assessor/manager/admin`) can write `practical_signoffs` and
  `certifications` — enforced by RLS via `is_staff()`. This is what stops people signing off
  their own practical.
- Reference tables are read-only to signed-in users.
- Set the first assessors/managers by updating `profiles.role` directly in Supabase.

## Screens (built in `src/App.jsx`)
1. **Sign in / sign up** — magic-link email; first time, create a profile (name, email, venue).
2. **My training** — the level ladder; current level expands to phases → modules; mark a module
   complete (dated); take the test once modules are done; see test + sign-off status; dated
   activity log.
3. **Module** — content from `curriculum.json` + an acknowledgement to mark complete.
4. **Test** — questions from `test_questions`; enforces the 100%/90% rule; saves the attempt.
5. **Assessor** — roster of everyone; open a person to review their dated progress, tick each
   module's practical criteria and sign off (records assessor name, initials, date); certify
   the level when test + practical are both done.

## The content
`src/content/curriculum.json` is the single source of truth for **levels, phases, modules,
module content and per-module practical criteria**, plus each level's duration, sign-off
authority and **online-test syllabus**. It was generated from the venue's training decks
(40 content modules across 5 levels). Re-running the seed re-imports it.

## What to finish
1. **Test banks.** `curriculum.json -> levels[].onlineTest.syllabus` lists what each level's
   test must cover. Author the actual questions (flag safety ones) and load them into
   `test_questions`. `src/content/testbank.sample.json` shows the shape and has starter
   questions for Trainee and Rookie.
2. **Roles.** Decide who are assessors/managers and set `profiles.role`.
3. **Nice-to-haves.** PDF certificate on completion; CSV export of who's certified; email
   invites; manager dashboard of everyone's status (the `v_level_status` view feeds this).

## Brand
Navy `#2C3D8F`, lime `#D4FF00`, red `#FF3C50`, ink `#171C3D`. Arial. Logo/fonts: drop in the
venue's assets. Values are **PRACE**; front-of-house staff are **Front Of House**.
