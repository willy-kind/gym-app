# Acceptance test — Gym PWA

Manual checks to run on the iPhone before relying on the app in the gym.
Automated tests (`npm test`, 160 tests) cover the logic and the database; this
list covers what only a real phone can show: install, offline, iOS behaviour,
layout, and the feel of using it one-handed.

Tick each box. If something fails, note the step number and what you saw.

**App:** https://willy-kind.github.io/gym-app/

---

## 0. Before you start

- [ ] 0.1 Delete any old "Gym" icon from the Home Screen (long-press → Remove App → Delete). This starts from an empty database, so the starter program loads fresh.
- [ ] 0.2 Phone is on Wi-Fi or mobile data for the install steps.

## 1. Install & app shell

- [ ] 1.0 **Mist look:** dark blue-grey by default with a soft blue accent; with the phone in Light mode, light grey with a deeper blue. Buttons are rounded pills, the current tab has a soft highlight, and blue buttons have readable (dark in dark mode, white in light mode) text.
- [ ] 1.1 Open the URL in **Safari** → Share → **Add to Home Screen**. The name is "Gym" and the icon is a blue dumbbell on black.
- [ ] 1.2 Open it from the Home Screen: full screen, no Safari address bar or toolbar.
- [ ] 1.3 The clock/battery area doesn't cover any text; the tab bar sits above the home indicator.
- [ ] 1.3a The tab bar's background reaches the very bottom edge of the screen (no black band under it); its labels sit above the home indicator.
- [ ] 1.3c The gear icon on Train is crisp, with no blue halo, also after tapping it and coming back.
- [ ] 1.3b The gear icon on Train and the Edit/Done buttons sit fully below the Dynamic Island: right after launch, after switching to another app and back, and after using the keyboard.
- [ ] 1.4 Four tabs work: **Train / Programs / History / Progress**. Train is selected on launch.
- [ ] 1.5 After a few seconds a "Ready to work offline" banner appears once; **OK** dismisses it.
- [ ] 1.6 Dark mode is the default look. Switch the phone to Light mode (Settings → Display): the app follows. Check the status bar clock is still readable in light mode (known risk).
- [ ] 1.7 Rotate the phone: nothing breaks (portrait is the intended layout).
- [ ] 1.8 Pinch-zoom and double-tap don't zoom inputs; tapping any text box doesn't zoom the page.

## 2. Offline & data safety

- [ ] 2.1 Turn on **Airplane Mode**, force-quit the app (swipe it away), reopen it: it loads, all tabs work.
- [ ] 2.2 Still offline: open a Progress chart you have never opened before — it loads.
- [ ] 2.3 Still offline: start a workout, log a set, finish it. Turn Airplane Mode off: everything is still there.
- [ ] 2.4 Settings (gear on Train) → bottom of the page says **Storage: persistent**. If it says "not marked persistent yet", note it and check again after a few days of use.

## 3. Programs (starter program and editing)

- [ ] 3.1 Programs → **Upper/Lower** → four days: Upper A, Lower A, Upper B, Lower B.
- [ ] 3.2 Open Upper A: 8 exercises, e.g. "Bench Press (Barbell) — 4 × 6-7 · 75 kg · 3:00 rest", "Pull Up — 6 × 3-4 · BW · 2:00 rest". Spot-check a few against `programs.md` (61.25 kg calf press shows correctly).
- [ ] 3.3 Tap an exercise → change sets, rep range, weight and rest → **Save**: the summary line updates.
- [ ] 3.4 Clear the weight box → Save: shows **BW**.
- [ ] 3.5 Type a weight with a comma (e.g. `22,5`): accepted as 22.5.
- [ ] 3.6 Day screen → **Edit** → move an exercise up/down; leave and come back: order kept. Remove one (confirm sheet appears).
- [ ] 3.7 Program screen → **Edit** → reorder days, rename a day (tap it), delete a day (confirm).
- [ ] 3.8 **Add exercise** → search "pull" → pick **Pull Up** on Lower A: its targets copy from Upper A (6 × 3-4, BW, 2:00).
- [ ] 3.9 **Add exercise** → type a new name → **Create "…"** → the target editor opens straight away.
- [ ] 3.10 When typing in any sheet, the sheet stays above the keyboard and the Save button is reachable.
- [ ] 3.11 **New program** → name it → add a day → add an exercise. Then **Archive** it: it moves to the Archived section and isn't offered on Train. **Unarchive**, then **Delete program** (confirm).
- [ ] 3.12 Programs → **Exercise library**: search works; rename an exercise → the new name shows on every day using it. An exercise used anywhere has no Delete button; a fresh unused one can be deleted.

## 4. Logging a workout

- [ ] 4.1 Train shows each day with "N exercises", a **Next** badge, and a **Start …** button at the bottom.
- [ ] 4.2 **Start Upper A**: title "Upper A", subtitle "Upper/Lower · Started 18:05 · 0 min"; Bench Press card is highlighted; the set panel is pinned at the bottom.
- [ ] 4.3 First time ever: card says "First time"; the panel is prefilled from the program (75 kg × 6).
- [ ] 4.4 Use −/+ on weight (2.5 kg steps) and reps, and type values directly (weight shows decimal keypad, reps shows number pad).
- [ ] 4.5 **Log set**: the set appears in the card as a rounded row "1  75 kg × 6", the card's counter goes to **1/4**, and the panel moves to "Set 2 of 4".
- [ ] 4.6 Double-tap **Log set** quickly: only one set is logged.
- [ ] 4.7 Log all 4 Bench sets: the card gets a ✓ and the panel jumps to **Incline Bench Press**, scrolling it into view.
- [ ] 4.8 Tap a different card: it becomes the active one in the panel.
- [ ] 4.9 **Pull Up**: weight box is empty with "BW" placeholder and labelled "Extra weight". Log one at BW and one with 5 kg: shown as "BW" and "BW + 5 kg".
- [ ] 4.10 Turn on **Warm-up**, log a set: shown as "W", doesn't count toward "Set x of y".
- [ ] 4.11 Tap a logged set → change reps → Save. Tap another → **Delete set** → "Tap again to delete" → gone.
- [ ] 4.12 **Add exercise** mid-workout → pick one → it appears at the end and becomes active; log a set on it.
- [ ] 4.13 With the keyboard open on the weight or reps box, the panel and Log set button remain usable.
- [ ] 4.13b Tap the weight box, then the reps box: the keyboard stays up. Close the keyboard (Done or tap elsewhere): the set panel and tab bar sit flush with the bottom of the screen, with no gap, without having to scroll. Repeat a few times, also with a sheet open (e.g. edit a set).
- [ ] 4.14 **Never lose a set:** log a set, then force-quit the app. Reopen: you land straight back in the workout with every set present.
- [ ] 4.15 Lock the phone for a minute mid-workout, unlock: still in the workout, nothing lost.
- [ ] 4.16 **Finish** (top right or bottom): summary shows sets, exercises, duration, and lists exercises with fewer sets than planned. Confirm → back to Train; Upper A shows "Last: Today" and **Next** moves to Lower A.
- [ ] 4.17 Start Upper A again: every card shows "Last time: 75 kg × 6, 6, …" and the panel prefills from last time's matching set.
- [ ] 4.18 Change the weight on set 1 (e.g. 77.5): set 2 prefills with 77.5, not last time's weight.
- [ ] 4.18b **Progression hint:** finish a workout where every planned Bench set hits the top of the range (4 × 7 at 75 kg). Next Upper A: the Bench card says "Go up: 77.5 kg · hit 7 on all 4 sets" and the panel prefills 77.5. The hint disappears after the first set; if you log set 1 at 75 instead, set 2 goes back to 75. No hint when a set fell short, or for pure bodyweight exercises.
- [ ] 4.18c **PR badge:** a set heavier than ever, or with a higher estimated 1RM than ever (e.g. 77.5 × 6 after 75 × 7), shows a blue **PR** pill in the card and later in History. Repeating it, warm-ups and your very first sets of an exercise don't get one.
- [ ] 4.19 **Discard workout** → confirm → gone (not in History).
- [ ] 4.20 Finish with no sets logged: you're offered **Discard** instead.
- [ ] 4.21 **Empty workout**: starts with no exercises; add exercises as you go.

## 5. Rest timer

- [ ] 5.1 Log a Bench set: a round timer appears at the top of the set panel at **3:00**, its ring emptying as it counts down, with "Resting · then Set 2 of 4" beside it (the panel's own title row hides while resting). There is no separate timer bar above the tab bar on the workout screen.
- [ ] 5.2 **−15s** / **+15s** change the time; −15s never goes below 0:00.
- [ ] 5.3 Lock the phone for ~60 s, unlock: the time has dropped by ~60 s (not paused).
- [ ] 5.4 Switch to another app for ~30 s and back: correct time.
- [ ] 5.5 Force-quit and reopen during a rest: the timer is still running with the right time.
- [ ] 5.6 Let it run out: the ring turns **green**, says "Rest over · next" and counts **+0:01, +0:02…**; −15 disappears. **OK** dismisses it.
- [ ] 5.7 Logging the next set restarts the countdown with that exercise's rest.
- [ ] 5.8 During a rest switch to Programs: the timer moves to a bar above the tab bar; tapping the time returns to the workout, where it is back in the set panel.
- [ ] 5.9 **Skip** hides the timer. Finishing or discarding the workout also clears it.
- [ ] 5.10 With the timer running in the set panel and the keyboard closed, the exercise cards above still have comfortable room on your phone's screen.

## 6. History

- [ ] 6.1 History lists finished workouts newest first under a month heading, e.g. "Upper A — Today · 52 min · 24 sets". Workouts that set personal records show "↑ 2 PR" on the right.
- [ ] 6.2 A workout in progress shows at the top as a blue-outlined **Workout in progress** card ("Lower A · Started 18:05 · 24 min") and opens it.
- [ ] 6.3 Open a workout: date row (program · times · duration), notes row, three tiles (sets, exercises, kg volume), and each exercise as a card with its sets as rounded rows (PRs marked) and **+ Add set**.
- [ ] 6.4 Edit a set, delete a set, **Add set** (prefilled from the last set), **Add exercise** + save a set.
- [ ] 6.5 Tap the date row → **Edit times**: the iOS date/time pickers open. Move the start to yesterday → Save: the row says "Yesterday". Starting that day again shows those sets as "Last time".
- [ ] 6.6 Set finish before start → error, nothing saved.
- [ ] 6.7 Add notes → reopen → edit them.
- [ ] 6.8 **Delete workout** → confirm → removed; "Last time" falls back to the previous workout.
- [ ] 6.9 **Share with AI** (one workout): open a workout → **Share with AI** → the iOS share sheet opens. Pick **Copy**, paste in an AI chat: a short question asking for feedback, then the workout with each exercise's target, warm-ups (W), numbered sets with rest times ("rest 2:45"), PRs, best e1RM and last time. Or pick your AI app directly.
- [ ] 6.10 **Share recent workouts**: History → **Share with AI…** → choose **Last 4 / Last 8 / 4 weeks**: the count, date range and a preview update. **Share…** opens the share sheet; the text lists the program targets once, then the workouts oldest first. Cancelling the share sheet changes nothing.

## 7. Progress charts

Have at least 3 finished workouts with different weights first (History → Edit times helps spread the dates).

- [ ] 7.1 Progress lists trained exercises, most recent first, with last date and session count; on the right the best e1RM, or "best set" reps for bodyweight-only exercises.
- [ ] 7.2 Open **Bench Press**: three charts — **Top set**, **Estimated 1RM**, **Volume** — each a blue line with dots and the latest value labelled at the right end. Nothing clipped at the edges; date labels don't overlap.
- [ ] 7.3 Touch and drag across a chart: a vertical line and a tooltip follow your finger ("85 kg × 6", date).
- [ ] 7.4 **3M / 6M / 1Y / All** change all three charts and their "Best … · +x in this period" lines together.
- [ ] 7.5 **Show as table** lists the same values, newest first.
- [ ] 7.6 Spot-check e1RM: 80 kg × 6 → 96 kg (Epley: 80 × (1 + 6/30)).
- [ ] 7.7 A bodyweight-only exercise (e.g. Hanging Leg Raise) shows **Most reps in a set** and **Total reps** instead.
- [ ] 7.8 Switch Light/Dark with a chart open: colours follow.

## 8. Backup & restore

- [ ] 8.1 Train shows a **Time for a backup** banner (once you have a finished workout and no recent backup). Tapping it opens Settings.
- [ ] 8.2 Settings → **Export backup** → **Save or share backup** → share sheet opens → **Save to Files** → saved as `gym-backup-YYYY-MM-DD.json`.
- [ ] 8.3 Settings now shows "Last backup: Today, HH:MM"; the Train banner is gone.
- [ ] 8.4 Cancelling the share sheet does **not** update "Last backup".
- [ ] 8.5 Make a change (e.g. log a workout or rename a program).
- [ ] 8.6 **Restore from backup…** → pick the file → a sheet shows the backup date and counts, and warns that everything will be replaced (and mentions the workout in progress if there is one). Cancel: nothing changes.
- [ ] 8.7 Restore again and tap **Replace all data**: "Restored N workouts…"; the change from 8.5 is gone and everything else matches the backup (programs, history, charts).
- [ ] 8.8 Pick a file that isn't a backup (any other file from Files): a clear error, nothing changes.
- [ ] 8.9 **Real disaster test:** export a backup, delete the app from the Home Screen, reinstall it from Safari (starter program only), restore the backup: all workouts and programs are back.
- [ ] 8.10 **Import from Strong:** export a backup first. In Strong: Settings → Export data → save the CSV to Files. Here: Settings → **Choose Strong CSV…** → pick it: a preview shows the number of workouts and sets, the date range, new exercises, rows skipped (cardio), and a kg/lb choice. Nothing changes until **Import N workouts**.
- [ ] 8.11 After importing: History shows the Strong workouts (titled "Workout", note "Strong: Upper A"), Progress charts and PRs include them, and "Share with AI" shows rest times from Strong's rest timer. Import the same file again: "Nothing new to import". A non-Strong CSV gives a clear error.

## 9. Settings

- [ ] 9.1 **Units → lb**: every weight is shown in lb — program targets, set panel (steps of 5 lb, unit label "lb"), logged sets, "Last time", History, Progress charts/table and volume.
- [ ] 9.2 In lb, log a set of 135 lb, switch back to **kg**: it shows 61.24 kg. Switch to lb again: 135 lb (no drift).
- [ ] 9.3 **Default rest** −/+ (15 s steps). Start an empty workout, add an exercise, log a set: the timer uses the default. Adding a brand-new exercise to a program day starts with this rest.
- [ ] 9.4 **Sound when rest is over** → turn on: you hear a short beep preview (ring/silent switch on ring). Log a set with a short rest and keep the app open: it beeps once when the rest ends. With the app in the background: no beep (expected).
- [ ] 9.5 **AI feedback** → edit the question (e.g. "How is my bench going? Keep it short."), then History → **Share with AI…**: the preview starts with your question, followed by the "How to read the log" note. Empty the box: the default question comes back in the shared text. **Reset to default** restores it in the box. Close and reopen the app: your question is kept.

## 10. Updates

- [ ] 10.1 After a new deploy, close and reopen the app (sometimes twice): the new version loads, and all data is still there.

---

## Known limitations (expected, not bugs)

- **No rest-over alert while the app is in the background or the phone is locked.** iOS web apps can't schedule local notifications without a push server; the timer is correct when you come back.
- **No vibration** on iOS for web apps. The rest-over signal is the green bar, plus the optional beep.
- **The beep** is muted by the ring/silent switch and only plays while the app is open.
- **Status bar text is always white** (chosen for the dark look); in Light mode it may be hard to read.
- **Exercises added mid-workout** are kept on the phone (not in the database) until their first set is logged; if the app is killed before that, add them again. No logged set is ever affected.
- **Settings and the last-backup date are per phone** and not included in backups.
- **Estimated 1RM uses Epley exactly**, so a single (1 rep) at 100 kg reads as 103.3 kg.
- **Volume** counts bodyweight sets as 0 kg (extra load only).
- **Data lives only on this phone.** Back up regularly; deleting the Home Screen app deletes its data.
