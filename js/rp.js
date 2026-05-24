// RP Strength constants and mesocycle math.
// Volume landmarks (sets per muscle group per week) are drawn from the
// recommendations Mike Israetel et al. have published. They're starting
// points — every lifter tunes them with experience.

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Shoulders (side delts)",
  "Shoulders (rear delts)",
  "Shoulders (front delts)",
  "Biceps",
  "Triceps",
  "Calves",
  "Forearms",
  "Traps",
  "Abs",
  "Neck",
  "Adductors",
  "Abductors",
];

// MV = Maintenance Volume, MEV = Minimum Effective Volume,
// MAV = Maximum Adaptive Volume (range), MRV = Maximum Recoverable Volume.
// All values are weekly working sets, RP defaults for an intermediate lifter.
export const DEFAULT_LANDMARKS = {
  Chest: { MV: 8, MEV: 10, MAV_lo: 12, MAV_hi: 20, MRV: 22 },
  Back: { MV: 8, MEV: 10, MAV_lo: 14, MAV_hi: 22, MRV: 25 },
  Quads: { MV: 6, MEV: 8, MAV_lo: 12, MAV_hi: 18, MRV: 20 },
  Hamstrings: { MV: 4, MEV: 6, MAV_lo: 10, MAV_hi: 16, MRV: 20 },
  Glutes: { MV: 2, MEV: 4, MAV_lo: 8, MAV_hi: 12, MRV: 16 },
  "Shoulders (side delts)": { MV: 8, MEV: 8, MAV_lo: 16, MAV_hi: 22, MRV: 26 },
  "Shoulders (rear delts)": { MV: 6, MEV: 8, MAV_lo: 14, MAV_hi: 20, MRV: 24 },
  Biceps: { MV: 5, MEV: 8, MAV_lo: 14, MAV_hi: 20, MRV: 26 },
  Triceps: { MV: 4, MEV: 6, MAV_lo: 10, MAV_hi: 14, MRV: 18 },
  Calves: { MV: 6, MEV: 8, MAV_lo: 12, MAV_hi: 16, MRV: 20 },
  Forearms: { MV: 2, MEV: 4, MAV_lo: 10, MAV_hi: 15, MRV: 20 },
  Traps: { MV: 0, MEV: 0, MAV_lo: 12, MAV_hi: 20, MRV: 26 },
  Abs: { MV: 0, MEV: 0, MAV_lo: 16, MAV_hi: 25, MRV: 25 },
  Neck: { MV: 0, MEV: 0, MAV_lo: 6, MAV_hi: 12, MRV: 16 },
  "Shoulders (front delts)": { MV: 0, MEV: 0, MAV_lo: 6, MAV_hi: 12, MRV: 16 },
  Adductors: { MV: 4, MEV: 6, MAV_lo: 8, MAV_hi: 14, MRV: 18 },
  Abductors: { MV: 4, MEV: 6, MAV_lo: 8, MAV_hi: 14, MRV: 18 },
};

// Comprehensive exercise library for hypertrophy training.
// Each entry: { name, group (primary muscle group), equipment }.
export const EXERCISE_LIBRARY = [
  // ── Chest ──────────────────────────────────────────────────
  { name: "Barbell Bench Press", group: "Chest", equipment: "barbell" },
  { name: "Incline Barbell Bench Press", group: "Chest", equipment: "barbell" },
  { name: "Decline Barbell Bench Press", group: "Chest", equipment: "barbell" },
  { name: "Dumbbell Bench Press", group: "Chest", equipment: "dumbbell" },
  { name: "Incline Dumbbell Press", group: "Chest", equipment: "dumbbell" },
  { name: "Decline Dumbbell Press", group: "Chest", equipment: "dumbbell" },
  { name: "Machine Chest Press", group: "Chest", equipment: "machine" },
  { name: "Smith Machine Bench Press", group: "Chest", equipment: "smith machine" },
  { name: "Smith Machine Incline Press", group: "Chest", equipment: "smith machine" },
  { name: "Cable Fly", group: "Chest", equipment: "cable" },
  { name: "Low-to-High Cable Fly", group: "Chest", equipment: "cable" },
  { name: "High-to-Low Cable Fly", group: "Chest", equipment: "cable" },
  { name: "Pec Deck", group: "Chest", equipment: "machine" },
  { name: "Dumbbell Fly", group: "Chest", equipment: "dumbbell" },
  { name: "Push-Up", group: "Chest", equipment: "bodyweight" },
  { name: "Dip (Chest)", group: "Chest", equipment: "bodyweight" },
  { name: "Incline Dumbbell Fly", group: "Chest", equipment: "dumbbell" },
  { name: "Machine Incline Press", group: "Chest", equipment: "machine" },
  { name: "Svend Press", group: "Chest", equipment: "barbell" },
  { name: "Cable Crossover", group: "Chest", equipment: "cable" },
  { name: "Single-Arm Cable Fly", group: "Chest", equipment: "cable" },
  { name: "Standing Cable Chest Press", group: "Chest", equipment: "cable" },
  { name: "Incline Cable Fly", group: "Chest", equipment: "cable" },
  { name: "HS Iso-Lateral Bench Press", group: "Chest", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Incline Press", group: "Chest", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Decline Press", group: "Chest", equipment: "hammer strength" },
  { name: "HS Wide Chest Press", group: "Chest", equipment: "hammer strength" },
  { name: "HS Seated Chest Press", group: "Chest", equipment: "hammer strength" },

  // ── Back ───────────────────────────────────────────────────
  { name: "Pull-Up", group: "Back", equipment: "bodyweight" },
  { name: "Chin-Up", group: "Back", equipment: "bodyweight" },
  { name: "Lat Pulldown", group: "Back", equipment: "cable" },
  { name: "Close-Grip Lat Pulldown", group: "Back", equipment: "cable" },
  { name: "Barbell Row", group: "Back", equipment: "barbell" },
  { name: "Pendlay Row", group: "Back", equipment: "barbell" },
  { name: "Dumbbell Row", group: "Back", equipment: "dumbbell" },
  { name: "Chest-Supported Row", group: "Back", equipment: "dumbbell" },
  { name: "T-Bar Row", group: "Back", equipment: "barbell" },
  { name: "Cable Row", group: "Back", equipment: "cable" },
  { name: "Seated Cable Row", group: "Back", equipment: "cable" },
  { name: "Machine Row", group: "Back", equipment: "machine" },
  { name: "Smith Machine Row", group: "Back", equipment: "smith machine" },
  { name: "Meadows Row", group: "Back", equipment: "barbell" },
  { name: "Straight-Arm Pulldown", group: "Back", equipment: "cable" },
  { name: "Inverted Row", group: "Back", equipment: "bodyweight" },
  { name: "Single-Arm Lat Pulldown", group: "Back", equipment: "cable" },
  { name: "Neutral-Grip Lat Pulldown", group: "Back", equipment: "cable" },
  { name: "Seal Row", group: "Back", equipment: "barbell" },
  { name: "Cable Pullover", group: "Back", equipment: "cable" },
  { name: "V-Bar Cable Row", group: "Back", equipment: "cable" },
  { name: "Wide-Grip Cable Row", group: "Back", equipment: "cable" },
  { name: "Single-Arm Cable Row", group: "Back", equipment: "cable" },
  { name: "Kneeling Cable Pullover", group: "Back", equipment: "cable" },
  { name: "Behind-the-Neck Lat Pulldown", group: "Back", equipment: "cable" },
  { name: "Reverse-Grip Lat Pulldown", group: "Back", equipment: "cable" },
  { name: "HS Iso-Lateral Row", group: "Back", equipment: "hammer strength" },
  { name: "HS Iso-Lateral High Row", group: "Back", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Low Row", group: "Back", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Front Lat Pulldown", group: "Back", equipment: "hammer strength" },
  { name: "HS DY Row", group: "Back", equipment: "hammer strength" },
  { name: "HS Seated Row", group: "Back", equipment: "hammer strength" },
  { name: "HS Lat Pulldown", group: "Back", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Seated Row", group: "Back", equipment: "hammer strength" },

  // ── Quads ──────────────────────────────────────────────────
  { name: "Back Squat", group: "Quads", equipment: "barbell" },
  { name: "Front Squat", group: "Quads", equipment: "barbell" },
  { name: "Hack Squat", group: "Quads", equipment: "machine" },
  { name: "Leg Press", group: "Quads", equipment: "machine" },
  { name: "Leg Extension", group: "Quads", equipment: "machine" },
  { name: "Goblet Squat", group: "Quads", equipment: "dumbbell" },
  { name: "Smith Machine Squat", group: "Quads", equipment: "smith machine" },
  { name: "Sissy Squat", group: "Quads", equipment: "bodyweight" },
  { name: "Barbell Lunge", group: "Quads", equipment: "barbell" },
  { name: "Dumbbell Lunge", group: "Quads", equipment: "dumbbell" },
  { name: "Walking Lunge", group: "Quads", equipment: "dumbbell" },
  { name: "Step-Up", group: "Quads", equipment: "dumbbell" },
  { name: "Belt Squat", group: "Quads", equipment: "machine" },
  { name: "Pendulum Squat", group: "Quads", equipment: "machine" },
  { name: "V-Squat", group: "Quads", equipment: "machine" },
  { name: "Cable Squat", group: "Quads", equipment: "cable" },
  { name: "Cable Leg Extension", group: "Quads", equipment: "cable" },
  { name: "HS Leg Press", group: "Quads", equipment: "hammer strength" },
  { name: "HS Linear Leg Press", group: "Quads", equipment: "hammer strength" },
  { name: "HS Leg Extension", group: "Quads", equipment: "hammer strength" },
  { name: "HS V-Squat", group: "Quads", equipment: "hammer strength" },
  { name: "HS Squat Lunge", group: "Quads", equipment: "hammer strength" },

  // ── Hamstrings ─────────────────────────────────────────────
  { name: "Romanian Deadlift", group: "Hamstrings", equipment: "barbell" },
  { name: "Dumbbell Romanian Deadlift", group: "Hamstrings", equipment: "dumbbell" },
  { name: "Stiff-Leg Deadlift", group: "Hamstrings", equipment: "barbell" },
  { name: "Lying Leg Curl", group: "Hamstrings", equipment: "machine" },
  { name: "Seated Leg Curl", group: "Hamstrings", equipment: "machine" },
  { name: "Standing Leg Curl", group: "Hamstrings", equipment: "machine" },
  { name: "Nordic Hamstring Curl", group: "Hamstrings", equipment: "bodyweight" },
  { name: "Good Morning", group: "Hamstrings", equipment: "barbell" },
  { name: "Cable Pull-Through", group: "Hamstrings", equipment: "cable" },
  { name: "Glute-Ham Raise", group: "Hamstrings", equipment: "bodyweight" },
  { name: "Single-Leg Romanian Deadlift", group: "Hamstrings", equipment: "dumbbell" },
  { name: "Kettlebell Swing", group: "Hamstrings", equipment: "kettlebell" },
  { name: "Dumbbell Good Morning", group: "Hamstrings", equipment: "dumbbell" },
  { name: "Band Leg Curl", group: "Hamstrings", equipment: "band" },
  { name: "Cable Leg Curl", group: "Hamstrings", equipment: "cable" },
  { name: "Cable Romanian Deadlift", group: "Hamstrings", equipment: "cable" },
  { name: "HS Lying Leg Curl", group: "Hamstrings", equipment: "hammer strength" },
  { name: "HS Seated Leg Curl", group: "Hamstrings", equipment: "hammer strength" },
  { name: "HS Kneeling Leg Curl", group: "Hamstrings", equipment: "hammer strength" },

  // ── Glutes ─────────────────────────────────────────────────
  { name: "Hip Thrust", group: "Glutes", equipment: "barbell" },
  { name: "Smith Machine Hip Thrust", group: "Glutes", equipment: "smith machine" },
  { name: "Dumbbell Hip Thrust", group: "Glutes", equipment: "dumbbell" },
  { name: "Bulgarian Split Squat", group: "Glutes", equipment: "dumbbell" },
  { name: "Cable Kickback", group: "Glutes", equipment: "cable" },
  { name: "Glute Bridge", group: "Glutes", equipment: "bodyweight" },
  { name: "Single-Leg Hip Thrust", group: "Glutes", equipment: "bodyweight" },
  { name: "Cable Pull-Through (Glutes)", group: "Glutes", equipment: "cable" },
  { name: "Machine Glute Kickback", group: "Glutes", equipment: "machine" },
  { name: "Sumo Deadlift", group: "Glutes", equipment: "barbell" },
  { name: "Reverse Lunge", group: "Glutes", equipment: "dumbbell" },
  { name: "Band Hip Thrust", group: "Glutes", equipment: "band" },
  { name: "Cable Hip Extension", group: "Glutes", equipment: "cable" },
  { name: "Cable Donkey Kick", group: "Glutes", equipment: "cable" },
  { name: "HS Glute Kickback", group: "Glutes", equipment: "hammer strength" },
  { name: "HS Hip Thrust", group: "Glutes", equipment: "hammer strength" },

  // ── Shoulders (side delts) ──────────────────────────────────
  { name: "Dumbbell Lateral Raise", group: "Shoulders (side delts)", equipment: "dumbbell" },
  { name: "Cable Lateral Raise", group: "Shoulders (side delts)", equipment: "cable" },
  { name: "Machine Lateral Raise", group: "Shoulders (side delts)", equipment: "machine" },
  { name: "Behind-the-Back Cable Lateral Raise", group: "Shoulders (side delts)", equipment: "cable" },
  { name: "Leaning Dumbbell Lateral Raise", group: "Shoulders (side delts)", equipment: "dumbbell" },
  { name: "Band Lateral Raise", group: "Shoulders (side delts)", equipment: "band" },
  { name: "Dumbbell Upright Row", group: "Shoulders (side delts)", equipment: "dumbbell" },
  { name: "Cable Upright Row", group: "Shoulders (side delts)", equipment: "cable" },
  { name: "Barbell Upright Row", group: "Shoulders (side delts)", equipment: "barbell" },
  { name: "Lu Raise", group: "Shoulders (side delts)", equipment: "dumbbell" },
  { name: "Kettlebell Lateral Raise", group: "Shoulders (side delts)", equipment: "kettlebell" },
  { name: "Incline Dumbbell Y-Raise", group: "Shoulders (side delts)", equipment: "dumbbell" },
  { name: "Cross-Body Cable Lateral Raise", group: "Shoulders (side delts)", equipment: "cable" },
  { name: "Cable W-Raise", group: "Shoulders (side delts)", equipment: "cable" },
  { name: "HS Lateral Raise", group: "Shoulders (side delts)", equipment: "hammer strength" },

  // ── Shoulders (rear delts) ──────────────────────────────────
  { name: "Reverse Pec Deck", group: "Shoulders (rear delts)", equipment: "machine" },
  { name: "Face Pull", group: "Shoulders (rear delts)", equipment: "cable" },
  { name: "Dumbbell Reverse Fly", group: "Shoulders (rear delts)", equipment: "dumbbell" },
  { name: "Incline Dumbbell Reverse Fly", group: "Shoulders (rear delts)", equipment: "dumbbell" },
  { name: "Cable Reverse Fly", group: "Shoulders (rear delts)", equipment: "cable" },
  { name: "Band Pull-Apart", group: "Shoulders (rear delts)", equipment: "band" },
  { name: "Chest-Supported Reverse Fly", group: "Shoulders (rear delts)", equipment: "dumbbell" },
  { name: "Machine Reverse Fly", group: "Shoulders (rear delts)", equipment: "machine" },
  { name: "Wide-Grip Cable Row (Rear Delt)", group: "Shoulders (rear delts)", equipment: "cable" },
  { name: "Rear Delt Cable Pull", group: "Shoulders (rear delts)", equipment: "cable" },
  { name: "Single-Arm Cable Reverse Fly", group: "Shoulders (rear delts)", equipment: "cable" },
  { name: "Kneeling Cable Face Pull", group: "Shoulders (rear delts)", equipment: "cable" },
  { name: "High Cable Reverse Fly", group: "Shoulders (rear delts)", equipment: "cable" },

  // ── Shoulders (front delts) ─────────────────────────────────
  { name: "Overhead Press", group: "Shoulders (front delts)", equipment: "barbell" },
  { name: "Dumbbell Shoulder Press", group: "Shoulders (front delts)", equipment: "dumbbell" },
  { name: "Arnold Press", group: "Shoulders (front delts)", equipment: "dumbbell" },
  { name: "Machine Shoulder Press", group: "Shoulders (front delts)", equipment: "machine" },
  { name: "Smith Machine Overhead Press", group: "Shoulders (front delts)", equipment: "smith machine" },
  { name: "Seated Barbell Press", group: "Shoulders (front delts)", equipment: "barbell" },
  { name: "Dumbbell Front Raise", group: "Shoulders (front delts)", equipment: "dumbbell" },
  { name: "Cable Front Raise", group: "Shoulders (front delts)", equipment: "cable" },
  { name: "Plate Front Raise", group: "Shoulders (front delts)", equipment: "barbell" },
  { name: "Landmine Press", group: "Shoulders (front delts)", equipment: "barbell" },
  { name: "Cable Shoulder Press", group: "Shoulders (front delts)", equipment: "cable" },
  { name: "Single-Arm Cable Front Raise", group: "Shoulders (front delts)", equipment: "cable" },
  { name: "HS Shoulder Press", group: "Shoulders (front delts)", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Shoulder Press", group: "Shoulders (front delts)", equipment: "hammer strength" },
  { name: "HS Military Press", group: "Shoulders (front delts)", equipment: "hammer strength" },

  // ── Biceps ─────────────────────────────────────────────────
  { name: "Barbell Curl", group: "Biceps", equipment: "barbell" },
  { name: "EZ-Bar Curl", group: "Biceps", equipment: "barbell" },
  { name: "Dumbbell Curl", group: "Biceps", equipment: "dumbbell" },
  { name: "Incline Dumbbell Curl", group: "Biceps", equipment: "dumbbell" },
  { name: "Hammer Curl", group: "Biceps", equipment: "dumbbell" },
  { name: "Cable Curl", group: "Biceps", equipment: "cable" },
  { name: "Cable Hammer Curl (Rope)", group: "Biceps", equipment: "cable" },
  { name: "Preacher Curl", group: "Biceps", equipment: "barbell" },
  { name: "Dumbbell Preacher Curl", group: "Biceps", equipment: "dumbbell" },
  { name: "Machine Curl", group: "Biceps", equipment: "machine" },
  { name: "Concentration Curl", group: "Biceps", equipment: "dumbbell" },
  { name: "Spider Curl", group: "Biceps", equipment: "dumbbell" },
  { name: "Bayesian Cable Curl", group: "Biceps", equipment: "cable" },
  { name: "Barbell Drag Curl", group: "Biceps", equipment: "barbell" },
  { name: "High Cable Curl", group: "Biceps", equipment: "cable" },
  { name: "Overhead Cable Curl", group: "Biceps", equipment: "cable" },
  { name: "Single-Arm Cable Curl", group: "Biceps", equipment: "cable" },
  { name: "Cable Preacher Curl", group: "Biceps", equipment: "cable" },
  { name: "Cable Concentration Curl", group: "Biceps", equipment: "cable" },
  { name: "Low Cable Curl (EZ-Bar)", group: "Biceps", equipment: "cable" },
  { name: "HS Preacher Curl", group: "Biceps", equipment: "hammer strength" },
  { name: "HS Bicep Curl", group: "Biceps", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Preacher Curl", group: "Biceps", equipment: "hammer strength" },

  // ── Triceps ────────────────────────────────────────────────
  { name: "Triceps Pushdown", group: "Triceps", equipment: "cable" },
  { name: "Triceps Rope Pushdown", group: "Triceps", equipment: "cable" },
  { name: "Overhead Cable Triceps Extension", group: "Triceps", equipment: "cable" },
  { name: "Overhead Dumbbell Triceps Extension", group: "Triceps", equipment: "dumbbell" },
  { name: "EZ-Bar Skull Crusher", group: "Triceps", equipment: "barbell" },
  { name: "Dumbbell Skull Crusher", group: "Triceps", equipment: "dumbbell" },
  { name: "Close-Grip Bench Press", group: "Triceps", equipment: "barbell" },
  { name: "Dip", group: "Triceps", equipment: "bodyweight" },
  { name: "Machine Dip", group: "Triceps", equipment: "machine" },
  { name: "Diamond Push-Up", group: "Triceps", equipment: "bodyweight" },
  { name: "Kickback", group: "Triceps", equipment: "dumbbell" },
  { name: "Cable Kickback", group: "Triceps", equipment: "cable" },
  { name: "JM Press", group: "Triceps", equipment: "barbell" },
  { name: "Single-Arm Cable Pushdown", group: "Triceps", equipment: "cable" },
  { name: "Reverse-Grip Cable Pushdown", group: "Triceps", equipment: "cable" },
  { name: "Cable Cross-Body Pushdown", group: "Triceps", equipment: "cable" },
  { name: "Single-Arm Overhead Cable Extension", group: "Triceps", equipment: "cable" },
  { name: "Cable V-Bar Pushdown", group: "Triceps", equipment: "cable" },
  { name: "Cable Skull Crusher", group: "Triceps", equipment: "cable" },
  { name: "HS Tricep Extension", group: "Triceps", equipment: "hammer strength" },
  { name: "HS Dip", group: "Triceps", equipment: "hammer strength" },
  { name: "HS Iso-Lateral Tricep Extension", group: "Triceps", equipment: "hammer strength" },

  // ── Calves ─────────────────────────────────────────────────
  { name: "Standing Calf Raise", group: "Calves", equipment: "machine" },
  { name: "Seated Calf Raise", group: "Calves", equipment: "machine" },
  { name: "Leg Press Calf Raise", group: "Calves", equipment: "machine" },
  { name: "Smith Machine Calf Raise", group: "Calves", equipment: "smith machine" },
  { name: "Dumbbell Calf Raise", group: "Calves", equipment: "dumbbell" },
  { name: "Barbell Calf Raise", group: "Calves", equipment: "barbell" },
  { name: "Single-Leg Calf Raise", group: "Calves", equipment: "bodyweight" },
  { name: "Donkey Calf Raise", group: "Calves", equipment: "machine" },
  { name: "Tibialis Raise", group: "Calves", equipment: "bodyweight" },
  { name: "Cable Calf Raise", group: "Calves", equipment: "cable" },
  { name: "HS Standing Calf Raise", group: "Calves", equipment: "hammer strength" },
  { name: "HS Seated Calf Raise", group: "Calves", equipment: "hammer strength" },

  // ── Forearms ───────────────────────────────────────────────
  { name: "Wrist Curl", group: "Forearms", equipment: "barbell" },
  { name: "Dumbbell Wrist Curl", group: "Forearms", equipment: "dumbbell" },
  { name: "Reverse Wrist Curl", group: "Forearms", equipment: "barbell" },
  { name: "Reverse Barbell Curl", group: "Forearms", equipment: "barbell" },
  { name: "Reverse Cable Curl", group: "Forearms", equipment: "cable" },
  { name: "Behind-the-Back Wrist Curl", group: "Forearms", equipment: "barbell" },
  { name: "Farmer's Walk", group: "Forearms", equipment: "dumbbell" },
  { name: "Dead Hang", group: "Forearms", equipment: "bodyweight" },
  { name: "Plate Pinch Hold", group: "Forearms", equipment: "barbell" },
  { name: "Zottman Curl", group: "Forearms", equipment: "dumbbell" },
  { name: "Cable Wrist Curl", group: "Forearms", equipment: "cable" },
  { name: "Cable Reverse Wrist Curl", group: "Forearms", equipment: "cable" },

  // ── Traps ──────────────────────────────────────────────────
  { name: "Barbell Shrug", group: "Traps", equipment: "barbell" },
  { name: "Dumbbell Shrug", group: "Traps", equipment: "dumbbell" },
  { name: "Smith Machine Shrug", group: "Traps", equipment: "smith machine" },
  { name: "Cable Shrug", group: "Traps", equipment: "cable" },
  { name: "Trap Bar Shrug", group: "Traps", equipment: "barbell" },
  { name: "Machine Shrug", group: "Traps", equipment: "machine" },
  { name: "Overhead Shrug", group: "Traps", equipment: "barbell" },
  { name: "Rack Pull", group: "Traps", equipment: "barbell" },
  { name: "Kettlebell Shrug", group: "Traps", equipment: "kettlebell" },
  { name: "Behind-the-Back Barbell Shrug", group: "Traps", equipment: "barbell" },
  { name: "Single-Arm Cable Shrug", group: "Traps", equipment: "cable" },
  { name: "Behind-the-Back Cable Shrug", group: "Traps", equipment: "cable" },
  { name: "HS Shrug", group: "Traps", equipment: "hammer strength" },

  // ── Abs ────────────────────────────────────────────────────
  { name: "Cable Crunch", group: "Abs", equipment: "cable" },
  { name: "Hanging Leg Raise", group: "Abs", equipment: "bodyweight" },
  { name: "Hanging Knee Raise", group: "Abs", equipment: "bodyweight" },
  { name: "Machine Crunch", group: "Abs", equipment: "machine" },
  { name: "Ab Wheel Rollout", group: "Abs", equipment: "bodyweight" },
  { name: "Decline Sit-Up", group: "Abs", equipment: "bodyweight" },
  { name: "Weighted Plank", group: "Abs", equipment: "bodyweight" },
  { name: "Pallof Press", group: "Abs", equipment: "cable" },
  { name: "Bicycle Crunch", group: "Abs", equipment: "bodyweight" },
  { name: "Captain's Chair Leg Raise", group: "Abs", equipment: "bodyweight" },
  { name: "V-Up", group: "Abs", equipment: "bodyweight" },
  { name: "Woodchop", group: "Abs", equipment: "cable" },
  { name: "Dragon Flag", group: "Abs", equipment: "bodyweight" },
  { name: "Kneeling Cable Crunch", group: "Abs", equipment: "cable" },
  { name: "Standing Cable Crunch", group: "Abs", equipment: "cable" },
  { name: "Cable Reverse Crunch", group: "Abs", equipment: "cable" },
  { name: "Cable Side Bend", group: "Abs", equipment: "cable" },
  { name: "Cable Oblique Twist", group: "Abs", equipment: "cable" },
  { name: "Low-to-High Cable Chop", group: "Abs", equipment: "cable" },
  { name: "High-to-Low Cable Chop", group: "Abs", equipment: "cable" },
  { name: "HS Crunch", group: "Abs", equipment: "hammer strength" },

  // ── Neck (5) ───────────────────────────────────────────────
  { name: "Neck Curl (Plate)", group: "Neck", equipment: "barbell" },
  { name: "Neck Extension (Plate)", group: "Neck", equipment: "barbell" },
  { name: "Neck Harness Extension", group: "Neck", equipment: "bodyweight" },
  { name: "Band Neck Flexion", group: "Neck", equipment: "band" },
  { name: "Band Neck Extension", group: "Neck", equipment: "band" },

  // ── Adductors (7) ─────────────────────────────────────────
  { name: "Machine Hip Adduction", group: "Adductors", equipment: "machine" },
  { name: "Cable Hip Adduction", group: "Adductors", equipment: "cable" },
  { name: "Copenhagen Plank", group: "Adductors", equipment: "bodyweight" },
  { name: "Sumo Squat", group: "Adductors", equipment: "dumbbell" },
  { name: "Wide-Stance Leg Press", group: "Adductors", equipment: "machine" },
  { name: "Band Hip Adduction", group: "Adductors", equipment: "band" },
  { name: "Side-Lying Adduction", group: "Adductors", equipment: "bodyweight" },

  // ── Abductors (7) ─────────────────────────────────────────
  { name: "Machine Hip Abduction", group: "Abductors", equipment: "machine" },
  { name: "Cable Hip Abduction", group: "Abductors", equipment: "cable" },
  { name: "Band Clamshell", group: "Abductors", equipment: "band" },
  { name: "Banded Side Walk", group: "Abductors", equipment: "band" },
  { name: "Side-Lying Hip Abduction", group: "Abductors", equipment: "bodyweight" },
  { name: "Fire Hydrant", group: "Abductors", equipment: "bodyweight" },
  { name: "Banded Squat Walk", group: "Abductors", equipment: "band" },
];

// ── Pre-made workout program templates ───────────────────────
export const PROGRAM_TEMPLATES = [
  // ─── PPL 3-Day ─────────────────────────────────────────────
  {
    name: "Push / Pull / Legs (3-Day)",
    days: [
      {
        name: "Push",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── PPL 6-Day ─────────────────────────────────────────────
  {
    name: "Push / Pull / Legs (6-Day)",
    days: [
      {
        name: "Push A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull A",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Push B",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Smith Machine Incline Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull B",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Row", muscleGroup: "Back" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Dumbbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs B",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── Upper / Lower 4-Day ──────────────────────────────────
  {
    name: "Upper / Lower (4-Day)",
    days: [
      {
        name: "Upper A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Lower A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper B",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Lower B",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── Bro Split 5-Day ──────────────────────────────────────
  {
    name: "Bro Split (5-Day)",
    days: [
      {
        name: "Chest",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Decline Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
        ],
      },
      {
        name: "Back",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Shoulders",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Arms",
        exercises: [
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Wrist Curl", muscleGroup: "Forearms" },
        ],
      },
    ],
  },

  // ─── Full Body 3-Day ──────────────────────────────────────
  {
    name: "Full Body (3-Day)",
    days: [
      {
        name: "Full Body A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Full Body B",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Full Body C",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Dip", muscleGroup: "Triceps" },
        ],
      },
    ],
  },

  // ─── Arnold Split 6-Day ───────────────────────────────────
  {
    name: "Arnold Split (6-Day)",
    days: [
      {
        name: "Chest & Back A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Dumbbell Fly", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
        ],
      },
      {
        name: "Shoulders & Arms A",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Legs A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Chest & Back B",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
        ],
      },
      {
        name: "Shoulders & Arms B",
        exercises: [
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Close-Grip Bench Press", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Legs B",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── PHUL ─────────────────────────────────────────────────
  {
    name: "PHUL (Power Hypertrophy Upper Lower)",
    days: [
      {
        name: "Upper Power",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower Power",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper Hypertrophy",
        exercises: [
          { exercise: "Incline Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower Hypertrophy",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── PHAT ─────────────────────────────────────────────────
  {
    name: "PHAT (Power Hypertrophy Adaptive Training)",
    days: [
      {
        name: "Upper Body Power",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Rack Pull", muscleGroup: "Traps" },
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower Body Power",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Back & Shoulders Hypertrophy",
        exercises: [
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "Dumbbell Shrug", muscleGroup: "Traps" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Legs Hypertrophy",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Chest & Arms Hypertrophy",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Machine Chest Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
    ],
  },
  // ─── 9. Full Body (2-Day) — Minimalist ─────────────────────
  {
    name: "Full Body (2-Day Minimalist)",
    days: [
      {
        name: "Full Body A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Full Body B",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
    ],
  },

  // ─── 10. Full Body (4-Day) ─────────────────────────────────
  {
    name: "Full Body (4-Day)",
    days: [
      {
        name: "Full Body A — Horizontal Push/Pull Focus",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Full Body B — Vertical Push/Pull Focus",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Full Body C — Strength Emphasis",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Full Body D — Volume Emphasis",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 11. Full Body (5-Day High Frequency) ──────────────────
  {
    name: "Full Body (5-Day High Frequency)",
    days: [
      {
        name: "Day 1 — Chest & Quad Priority",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Dumbbell Row", muscleGroup: "Back" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Day 2 — Back & Hamstring Priority",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Day 3 — Shoulder & Glute Priority",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Day 4 — Chest & Back Priority",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Day 5 — Legs & Arms Priority",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 12. Upper / Lower (6-Day) ─────────────────────────────
  {
    name: "Upper / Lower (6-Day)",
    days: [
      {
        name: "Upper A — Strength",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower A — Strength",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper B — Hypertrophy",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower B — Hypertrophy",
        exercises: [
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper C — Volume",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower C — Volume",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Belt Squat", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Standing Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Leg Press Calf Raise", muscleGroup: "Calves" },
          { exercise: "Machine Crunch", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 13. Chest/Back, Shoulders/Arms, Legs (3-Day) ──────────
  {
    name: "Chest & Back / Shoulders & Arms / Legs (3-Day)",
    days: [
      {
        name: "Chest & Back",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Fly", muscleGroup: "Chest" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
        ],
      },
      {
        name: "Shoulders & Arms",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 14. Chest/Back, Shoulders/Arms, Legs (6-Day) ──────────
  {
    name: "Chest & Back / Shoulders & Arms / Legs (6-Day)",
    days: [
      {
        name: "Chest & Back A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
        ],
      },
      {
        name: "Shoulders & Arms A",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Legs A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Chest & Back B",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Incline Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Cable Pullover", muscleGroup: "Back" },
        ],
      },
      {
        name: "Shoulders & Arms B",
        exercises: [
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "EZ-Bar Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Legs B",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 15. Push/Pull (4-Day, Legs Integrated) ────────────────
  {
    name: "Push / Pull (4-Day, Legs Integrated)",
    days: [
      {
        name: "Push A (Chest Focus + Quads)",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Pull A (Back Focus + Hamstrings)",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Push B (Shoulder Focus + Quads)",
        exercises: [
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Pull B (Back Focus + Hamstrings)",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Dumbbell Shrug", muscleGroup: "Traps" },
        ],
      },
    ],
  },

  // ─── 16. Push/Pull/Legs/Upper/Lower (5-Day Hybrid) ─────────
  {
    name: "PPL + Upper/Lower Hybrid (5-Day)",
    days: [
      {
        name: "Push",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 17. Torso / Limbs (4-Day) — DC Training Style ─────────
  {
    name: "Torso / Limbs (4-Day)",
    days: [
      {
        name: "Torso A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Limbs A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Torso B",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Limbs B",
        exercises: [
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 18. Chest/Triceps, Back/Biceps, Shoulders/Legs (3-Day) ─
  {
    name: "Chest & Triceps / Back & Biceps / Shoulders & Legs (3-Day)",
    days: [
      {
        name: "Chest & Triceps",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Close-Grip Bench Press", muscleGroup: "Triceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Back & Biceps",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Shoulders & Legs",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 19. Chest/Triceps, Back/Biceps, Shoulders/Legs (6-Day) ─
  {
    name: "Chest & Triceps / Back & Biceps / Shoulders & Legs (6-Day)",
    days: [
      {
        name: "Chest & Triceps A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Back & Biceps A",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Shoulders & Legs A",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Chest & Triceps B",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Close-Grip Bench Press", muscleGroup: "Triceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Dip", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Back & Biceps B",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "EZ-Bar Curl", muscleGroup: "Biceps" },
          { exercise: "Preacher Curl", muscleGroup: "Biceps" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Shoulders & Legs B",
        exercises: [
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 20. PPL + Arms (4-Day) ────────────────────────────────
  {
    name: "Push / Pull / Legs / Arms (4-Day)",
    days: [
      {
        name: "Push",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
        ],
      },
      {
        name: "Pull",
        exercises: [
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Arms & Delts",
        exercises: [
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
    ],
  },

  // ─── 21. 5/3/1 Boring But Big (4-Day) ─────────────────────
  {
    name: "5/3/1 Boring But Big (4-Day)",
    days: [
      {
        name: "Squat Day",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Bench Day",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Dumbbell Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Deadlift Day",
        exercises: [
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "OHP Day",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
        ],
      },
    ],
  },

  // ─── 22. GZCL Method (4-Day) ──────────────────────────────
  {
    name: "GZCL Method (4-Day)",
    days: [
      {
        name: "Day 1 — Squat T1",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Day 2 — Bench T1",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Day 3 — Deadlift T1",
        exercises: [
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Day 4 — OHP T1",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
        ],
      },
    ],
  },

  // ─── 23. Texas Method (3-Day) ──────────────────────────────
  {
    name: "Texas Method (3-Day)",
    days: [
      {
        name: "Volume Day (Monday)",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Recovery Day (Wednesday)",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Chin-Up", muscleGroup: "Back" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Intensity Day (Friday)",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 24. Starting Strength / Stronglifts Style (3-Day) ─────
  {
    name: "Novice Linear Progression (3-Day A/B)",
    days: [
      {
        name: "Workout A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Workout B",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
    ],
  },

  // ─── 25. Powerbuilding (4-Day) ─────────────────────────────
  {
    name: "Powerbuilding (4-Day)",
    days: [
      {
        name: "Heavy Upper",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Close-Grip Bench Press", muscleGroup: "Triceps" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Heavy Lower",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Hypertrophy Upper",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Hypertrophy Lower",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 26. Powerbuilding (5-Day) ─────────────────────────────
  {
    name: "Powerbuilding (5-Day)",
    days: [
      {
        name: "Squat Focus",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Bench Focus",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Close-Grip Bench Press", muscleGroup: "Triceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Deadlift & Back Focus",
        exercises: [
          { exercise: "Sumo Deadlift", muscleGroup: "Glutes" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "OHP & Shoulders",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Arms & Accessories",
        exercises: [
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Wrist Curl", muscleGroup: "Forearms" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 27. Bro Split (6-Day) — High Volume ──────────────────
  {
    name: "Bro Split (6-Day High Volume)",
    days: [
      {
        name: "Chest",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Decline Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Dip (Chest)", muscleGroup: "Chest" },
        ],
      },
      {
        name: "Back",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Seated Cable Row", muscleGroup: "Back" },
          { exercise: "T-Bar Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
        ],
      },
      {
        name: "Shoulders",
        exercises: [
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Quads & Calves",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Walking Lunge", muscleGroup: "Quads" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Hamstrings & Glutes",
        exercises: [
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Cable Kickback", muscleGroup: "Glutes" },
        ],
      },
      {
        name: "Arms",
        exercises: [
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Preacher Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Dip", muscleGroup: "Triceps" },
        ],
      },
    ],
  },

  // ─── 28. Meadows-Style PPL (6-Day) — Machine-Heavy ─────────
  {
    name: "Machine-Heavy PPL (6-Day)",
    days: [
      {
        name: "Push A — Chest Emphasis",
        exercises: [
          { exercise: "Machine Chest Press", muscleGroup: "Chest" },
          { exercise: "Smith Machine Incline Press", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Machine Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Machine Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Machine Dip", muscleGroup: "Triceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull A — Width Emphasis",
        exercises: [
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Machine Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Machine Curl", muscleGroup: "Biceps" },
          { exercise: "Cable Hammer Curl (Rope)", muscleGroup: "Biceps" },
          { exercise: "Machine Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs A — Quad Emphasis",
        exercises: [
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Smith Machine Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Machine Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Push B — Shoulder Emphasis",
        exercises: [
          { exercise: "Smith Machine Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Smith Machine Bench Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Behind-the-Back Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Single-Arm Cable Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull B — Thickness Emphasis",
        exercises: [
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Close-Grip Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Cable Pullover", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Bayesian Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Legs B — Hamstring & Glute Emphasis",
        exercises: [
          { exercise: "Belt Squat", muscleGroup: "Quads" },
          { exercise: "Pendulum Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Machine Hip Adduction", muscleGroup: "Adductors" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 29. Hammer Strength Only (4-Day) ──────────────────────
  {
    name: "Hammer Strength Only (4-Day)",
    days: [
      {
        name: "Upper A",
        exercises: [
          { exercise: "HS Iso-Lateral Bench Press", muscleGroup: "Chest" },
          { exercise: "HS Iso-Lateral Incline Press", muscleGroup: "Chest" },
          { exercise: "HS Iso-Lateral Row", muscleGroup: "Back" },
          { exercise: "HS Iso-Lateral Front Lat Pulldown", muscleGroup: "Back" },
          { exercise: "HS Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "HS Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "HS Preacher Curl", muscleGroup: "Biceps" },
          { exercise: "HS Tricep Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower A",
        exercises: [
          { exercise: "HS V-Squat", muscleGroup: "Quads" },
          { exercise: "HS Leg Press", muscleGroup: "Quads" },
          { exercise: "HS Leg Extension", muscleGroup: "Quads" },
          { exercise: "HS Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "HS Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "HS Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "HS Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper B",
        exercises: [
          { exercise: "HS Wide Chest Press", muscleGroup: "Chest" },
          { exercise: "HS Iso-Lateral Decline Press", muscleGroup: "Chest" },
          { exercise: "HS Iso-Lateral High Row", muscleGroup: "Back" },
          { exercise: "HS DY Row", muscleGroup: "Back" },
          { exercise: "HS Iso-Lateral Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "HS Shrug", muscleGroup: "Traps" },
          { exercise: "HS Bicep Curl", muscleGroup: "Biceps" },
          { exercise: "HS Dip", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower B",
        exercises: [
          { exercise: "HS Linear Leg Press", muscleGroup: "Quads" },
          { exercise: "HS Squat Lunge", muscleGroup: "Quads" },
          { exercise: "HS Leg Extension", muscleGroup: "Quads" },
          { exercise: "HS Kneeling Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "HS Glute Kickback", muscleGroup: "Glutes" },
          { exercise: "HS Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "HS Crunch", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 30. Cable-Only (3-Day) ────────────────────────────────
  {
    name: "Cable-Only (3-Day)",
    days: [
      {
        name: "Push",
        exercises: [
          { exercise: "Standing Cable Chest Press", muscleGroup: "Chest" },
          { exercise: "Low-to-High Cable Fly", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Cable Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Single-Arm Cable Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull",
        exercises: [
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Straight-Arm Pulldown", muscleGroup: "Back" },
          { exercise: "Cable Pullover", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Cable Curl", muscleGroup: "Biceps" },
          { exercise: "Cable Hammer Curl (Rope)", muscleGroup: "Biceps" },
          { exercise: "Cable Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Cable Squat", muscleGroup: "Quads" },
          { exercise: "Cable Leg Extension", muscleGroup: "Quads" },
          { exercise: "Cable Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Cable Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Cable Kickback", muscleGroup: "Glutes" },
          { exercise: "Cable Hip Extension", muscleGroup: "Glutes" },
          { exercise: "Cable Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 31. Bodyweight Only (3-Day) ──────────────────────────
  {
    name: "Bodyweight Only (3-Day)",
    days: [
      {
        name: "Upper Push",
        exercises: [
          { exercise: "Push-Up", muscleGroup: "Chest" },
          { exercise: "Dip (Chest)", muscleGroup: "Chest" },
          { exercise: "Diamond Push-Up", muscleGroup: "Triceps" },
          { exercise: "Dip", muscleGroup: "Triceps" },
          { exercise: "Inverted Row", muscleGroup: "Back" },
          { exercise: "Ab Wheel Rollout", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper Pull",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Chin-Up", muscleGroup: "Back" },
          { exercise: "Inverted Row", muscleGroup: "Back" },
          { exercise: "Band Pull-Apart", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Dead Hang", muscleGroup: "Forearms" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Lower Body",
        exercises: [
          { exercise: "Sissy Squat", muscleGroup: "Quads" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Nordic Hamstring Curl", muscleGroup: "Hamstrings" },
          { exercise: "Glute Bridge", muscleGroup: "Glutes" },
          { exercise: "Single-Leg Calf Raise", muscleGroup: "Calves" },
          { exercise: "Copenhagen Plank", muscleGroup: "Adductors" },
          { exercise: "Dragon Flag", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 32. Dumbbell-Only (4-Day Upper/Lower) ────────────────
  {
    name: "Dumbbell-Only Upper / Lower (4-Day)",
    days: [
      {
        name: "Upper A",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Dumbbell Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Shoulder Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Dumbbell Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Dumbbell Reverse Fly", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Lower A",
        exercises: [
          { exercise: "Goblet Squat", muscleGroup: "Quads" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Dumbbell Lunge", muscleGroup: "Quads" },
          { exercise: "Dumbbell Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Dumbbell Calf Raise", muscleGroup: "Calves" },
          { exercise: "Dumbbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Upper B",
        exercises: [
          { exercise: "Incline Dumbbell Fly", muscleGroup: "Chest" },
          { exercise: "Decline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Leaning Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Dumbbell Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Incline Dumbbell Reverse Fly", muscleGroup: "Shoulders (rear delts)" },
        ],
      },
      {
        name: "Lower B",
        exercises: [
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Step-Up", muscleGroup: "Quads" },
          { exercise: "Single-Leg Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Walking Lunge", muscleGroup: "Quads" },
          { exercise: "Single-Leg Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Dumbbell Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 33. Upper/Lower/Push/Pull (4-Day Hybrid) ─────────────
  {
    name: "Upper / Lower / Push / Pull (4-Day Hybrid)",
    days: [
      {
        name: "Upper (Balanced)",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower (Balanced)",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Push (Volume)",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pec Deck", muscleGroup: "Chest" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Pull (Volume)",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Dumbbell Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
        ],
      },
    ],
  },

  // ─── 34. Chest & Arms / Back & Shoulders / Legs (3-Day) ────
  {
    name: "Chest & Arms / Back & Shoulders / Legs (3-Day)",
    days: [
      {
        name: "Chest & Arms",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
          { exercise: "Wrist Curl", muscleGroup: "Forearms" },
        ],
      },
      {
        name: "Back & Shoulders",
        exercises: [
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Shrug", muscleGroup: "Traps" },
        ],
      },
      {
        name: "Legs",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
    ],
  },

  // ─── 35. Antagonist Superset PPL (3-Day) ───────────────────
  {
    name: "Antagonist Superset PPL (3-Day)",
    days: [
      {
        name: "Push (Paired: Chest/Back emphasis)",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
        ],
      },
      {
        name: "Pull (Paired: Biceps/Triceps emphasis)",
        exercises: [
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Reverse Barbell Curl", muscleGroup: "Forearms" },
        ],
      },
      {
        name: "Legs (Paired: Quads/Hamstrings)",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 36. Upper Emphasis (5-Day: U/L/U/L/U) ────────────────
  {
    name: "Upper Emphasis (5-Day: U/L/U/L/U)",
    days: [
      {
        name: "Upper A — Strength",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Close-Grip Bench Press", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper B — Hypertrophy",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Rope Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower B",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper C — Volume & Arms",
        exercises: [
          { exercise: "Dumbbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Chest-Supported Row", muscleGroup: "Back" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "EZ-Bar Curl", muscleGroup: "Biceps" },
          { exercise: "Hammer Curl", muscleGroup: "Biceps" },
          { exercise: "EZ-Bar Skull Crusher", muscleGroup: "Triceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
    ],
  },

  // ─── 37. Lower Emphasis (5-Day: L/U/L/U/L) ────────────────
  {
    name: "Lower Emphasis (5-Day: L/U/L/U/L)",
    days: [
      {
        name: "Lower A — Quad Strength",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
          { exercise: "Cable Crunch", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper A",
        exercises: [
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower B — Posterior Chain",
        exercises: [
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
          { exercise: "Hanging Leg Raise", muscleGroup: "Abs" },
        ],
      },
      {
        name: "Upper B",
        exercises: [
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Lower C — Volume",
        exercises: [
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Belt Squat", muscleGroup: "Quads" },
          { exercise: "Standing Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Cable Kickback", muscleGroup: "Glutes" },
          { exercise: "Machine Hip Adduction", muscleGroup: "Adductors" },
          { exercise: "Leg Press Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

  // ─── 38. Quad / Hamstring / Push / Pull (4-Day) ────────────
  {
    name: "Quad & Push / Hamstring & Pull (4-Day)",
    days: [
      {
        name: "Quads & Push A",
        exercises: [
          { exercise: "Back Squat", muscleGroup: "Quads" },
          { exercise: "Leg Press", muscleGroup: "Quads" },
          { exercise: "Leg Extension", muscleGroup: "Quads" },
          { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
          { exercise: "Overhead Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Dumbbell Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
        ],
      },
      {
        name: "Hamstrings & Pull A",
        exercises: [
          { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Lying Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Hip Thrust", muscleGroup: "Glutes" },
          { exercise: "Barbell Row", muscleGroup: "Back" },
          { exercise: "Lat Pulldown", muscleGroup: "Back" },
          { exercise: "Face Pull", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Barbell Curl", muscleGroup: "Biceps" },
        ],
      },
      {
        name: "Quads & Push B",
        exercises: [
          { exercise: "Front Squat", muscleGroup: "Quads" },
          { exercise: "Hack Squat", muscleGroup: "Quads" },
          { exercise: "Incline Dumbbell Press", muscleGroup: "Chest" },
          { exercise: "Cable Fly", muscleGroup: "Chest" },
          { exercise: "Arnold Press", muscleGroup: "Shoulders (front delts)" },
          { exercise: "Cable Lateral Raise", muscleGroup: "Shoulders (side delts)" },
          { exercise: "Overhead Cable Triceps Extension", muscleGroup: "Triceps" },
          { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
        ],
      },
      {
        name: "Hamstrings & Pull B",
        exercises: [
          { exercise: "Stiff-Leg Deadlift", muscleGroup: "Hamstrings" },
          { exercise: "Seated Leg Curl", muscleGroup: "Hamstrings" },
          { exercise: "Bulgarian Split Squat", muscleGroup: "Glutes" },
          { exercise: "Pull-Up", muscleGroup: "Back" },
          { exercise: "Cable Row", muscleGroup: "Back" },
          { exercise: "Reverse Pec Deck", muscleGroup: "Shoulders (rear delts)" },
          { exercise: "Incline Dumbbell Curl", muscleGroup: "Biceps" },
          { exercise: "Seated Calf Raise", muscleGroup: "Calves" },
        ],
      },
    ],
  },

];

// ═══════════════════════════════════════════════════════════════
// EXERCISE PROFILES
// ═══════════════════════════════════════════════════════════════

export const EXERCISE_PROFILES = {
  // CHEST
  "Barbell Bench Press":          { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 12 }, restRange: { min: 120, max: 180 }, progression: 0.020 },
  "Incline Barbell Bench Press":  { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 }, restRange: { min: 120, max: 180 }, progression: 0.020 },
  "Decline Barbell Bench Press":  { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 }, restRange: { min: 120, max: 180 }, progression: 0.020 },
  "Dumbbell Bench Press":         { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Incline Dumbbell Press":       { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Decline Dumbbell Press":       { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Machine Chest Press":          { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "Smith Machine Bench Press":    { type: "compound",  tier: "moderate", repRange: { min: 6, max: 12 }, restRange: { min: 90, max: 150 },  progression: 0.020 },
  "Smith Machine Incline Press":  { type: "compound",  tier: "moderate", repRange: { min: 6, max: 12 }, restRange: { min: 90, max: 150 },  progression: 0.020 },
  "Machine Incline Press":        { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "Cable Fly":                    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Low-to-High Cable Fly":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "High-to-Low Cable Fly":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Incline Cable Fly":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Pec Deck":                    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Dumbbell Fly":                { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.010 },
  "Incline Dumbbell Fly":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.010 },
  "Cable Crossover":             { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Single-Arm Cable Fly":        { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.010 },
  "Standing Cable Chest Press":   { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Svend Press":                 { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.010 },
  "Push-Up":                     { type: "compound",  tier: "moderate", repRange: { min: 8, max: 25 },  restRange: { min: 60, max: 120 }, progression: 0.000 },
  "Dip (Chest)":                 { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 90, max: 150 }, progression: 0.020 },
  "Landmine Press":              { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Iso-Lateral Bench Press":  { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Iso-Lateral Incline Press":{ type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Iso-Lateral Decline Press":{ type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Wide Chest Press":         { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Seated Chest Press":       { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 },  progression: 0.018 },
  // BACK
  "Pull-Up":                     { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 12 },  restRange: { min: 120, max: 180 }, progression: 0.000 },
  "Chin-Up":                     { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 12 },  restRange: { min: 120, max: 180 }, progression: 0.000 },
  "Lat Pulldown":                { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.015 },
  "Close-Grip Lat Pulldown":     { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.015 },
  "Neutral-Grip Lat Pulldown":   { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.015 },
  "Single-Arm Lat Pulldown":     { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Behind-the-Neck Lat Pulldown":{ type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.015 },
  "Reverse-Grip Lat Pulldown":   { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.015 },
  "HS Lat Pulldown":             { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "HS Iso-Lateral Front Lat Pulldown": { type: "compound", tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 90, max: 120 }, progression: 0.018 },
  "Barbell Row":                 { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 120, max: 180 }, progression: 0.020 },
  "Pendlay Row":                 { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 120, max: 180 }, progression: 0.020 },
  "T-Bar Row":                   { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 120, max: 150 }, progression: 0.020 },
  "Seal Row":                    { type: "compound",  tier: "heavy",    repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "Meadows Row":                 { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },  progression: 0.015 },
  "Smith Machine Row":           { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "Dumbbell Row":                { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 60, max: 90 },  progression: 0.015 },
  "Cable Row":                   { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.015 },
  "Seated Cable Row":            { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.015 },
  "V-Bar Cable Row":             { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.015 },
  "Wide-Grip Cable Row":         { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.015 },
  "Single-Arm Cable Row":        { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Machine Row":                 { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "Chest-Supported Row":         { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "Inverted Row":                { type: "compound",  tier: "moderate", repRange: { min: 8, max: 20 },  restRange: { min: 60, max: 90 },  progression: 0.000 },
  "HS Iso-Lateral Row":          { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "HS Iso-Lateral High Row":     { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "HS Iso-Lateral Low Row":      { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "HS DY Row":                   { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "HS Seated Row":               { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "HS Iso-Lateral Seated Row":   { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 }, progression: 0.018 },
  "Straight-Arm Pulldown":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Cable Pullover":              { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Kneeling Cable Pullover":     { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  // QUADS
  "Back Squat":                  { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 150, max: 240 }, progression: 0.020 },
  "Front Squat":                 { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 150, max: 240 }, progression: 0.020 },
  "Hack Squat":                  { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "Smith Machine Squat":         { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "Belt Squat":                  { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 150 }, progression: 0.018 },
  "Pendulum Squat":              { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 150 }, progression: 0.018 },
  "V-Squat":                     { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 150 }, progression: 0.018 },
  "HS V-Squat":                  { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 150 }, progression: 0.018 },
  "Goblet Squat":                { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Cable Squat":                 { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 90, max: 120 },  progression: 0.012 },
  "Sissy Squat":                 { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.000 },
  "Leg Press":                   { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "HS Leg Press":                { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "HS Linear Leg Press":         { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "Wide-Stance Leg Press":       { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "Leg Extension":               { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Cable Leg Extension":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.010 },
  "HS Leg Extension":            { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Barbell Lunge":               { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Dumbbell Lunge":              { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.015 },
  "Walking Lunge":               { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Step-Up":                     { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  "HS Squat Lunge":              { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  // HAMSTRINGS
  "Romanian Deadlift":           { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 120, max: 180 }, progression: 0.020 },
  "Dumbbell Romanian Deadlift":  { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Stiff-Leg Deadlift":         { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 120, max: 180 }, progression: 0.020 },
  "Good Morning":                { type: "compound",  tier: "heavy",    repRange: { min: 8, max: 12 },  restRange: { min: 120, max: 150 }, progression: 0.015 },
  "Dumbbell Good Morning":       { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.012 },
  "Cable Pull-Through":          { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Cable Romanian Deadlift":     { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Single-Leg Romanian Deadlift":{ type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Kettlebell Swing":            { type: "compound",  tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Lying Leg Curl":              { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Seated Leg Curl":             { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Standing Leg Curl":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Cable Leg Curl":              { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Band Leg Curl":               { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Nordic Hamstring Curl":       { type: "isolation", tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 90, max: 120 },  progression: 0.000 },
  "Glute-Ham Raise":             { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.000 },
  "HS Lying Leg Curl":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "HS Seated Leg Curl":          { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "HS Kneeling Leg Curl":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  // GLUTES
  "Hip Thrust":                  { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Smith Machine Hip Thrust":    { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Dumbbell Hip Thrust":         { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Band Hip Thrust":             { type: "compound",  tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 45, max: 60 },   progression: 0.000 },
  "HS Hip Thrust":               { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 },  progression: 0.018 },
  "Glute Bridge":                { type: "compound",  tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.000 },
  "Single-Leg Hip Thrust":       { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.000 },
  "Bulgarian Split Squat":       { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Reverse Lunge":               { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Cable Kickback":              { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Donkey Kick":           { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Hip Extension":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Machine Glute Kickback":      { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "HS Glute Kickback":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Cable Pull-Through (Glutes)": { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Sumo Deadlift":               { type: "compound",  tier: "heavy",    repRange: { min: 3, max: 8 },   restRange: { min: 180, max: 300 }, progression: 0.015 },
  // SHOULDERS (SIDE DELTS)
  "Dumbbell Lateral Raise":      { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Cable Lateral Raise":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Machine Lateral Raise":       { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Behind-the-Back Cable Lateral Raise": { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 }, progression: 0.010 },
  "Leaning Dumbbell Lateral Raise": { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 }, progression: 0.008 },
  "Cross-Body Cable Lateral Raise": { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 }, progression: 0.010 },
  "HS Lateral Raise":            { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Band Lateral Raise":          { type: "isolation", tier: "light",    repRange: { min: 15, max: 30 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Kettlebell Lateral Raise":    { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Lu Raise":                    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Incline Dumbbell Y-Raise":    { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Cable W-Raise":               { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Dumbbell Upright Row":        { type: "hybrid",    tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Cable Upright Row":           { type: "hybrid",    tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Barbell Upright Row":         { type: "hybrid",    tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  // SHOULDERS (REAR DELTS)
  "Reverse Pec Deck":            { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Face Pull":                   { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Dumbbell Reverse Fly":        { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Incline Dumbbell Reverse Fly":{ type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Chest-Supported Reverse Fly": { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Cable Reverse Fly":           { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "High Cable Reverse Fly":      { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Single-Arm Cable Reverse Fly":{ type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Machine Reverse Fly":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Band Pull-Apart":             { type: "isolation", tier: "light",    repRange: { min: 15, max: 30 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Rear Delt Cable Pull":        { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Kneeling Cable Face Pull":    { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Wide-Grip Cable Row (Rear Delt)": { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 }, progression: 0.012 },
  // SHOULDERS (FRONT DELTS)
  "Overhead Press":              { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "Seated Barbell Press":        { type: "compound",  tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 120, max: 180 }, progression: 0.018 },
  "Dumbbell Shoulder Press":     { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Arnold Press":                { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Machine Shoulder Press":      { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 90, max: 120 },  progression: 0.018 },
  "Smith Machine Overhead Press":{ type: "compound",  tier: "moderate", repRange: { min: 6, max: 12 },  restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Cable Shoulder Press":        { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Dumbbell Front Raise":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Cable Front Raise":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Plate Front Raise":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Single-Arm Cable Front Raise":{ type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "HS Shoulder Press":           { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Iso-Lateral Shoulder Press":{ type: "compound", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.018 },
  "HS Military Press":           { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.018 },
  // BICEPS
  "Barbell Curl":                { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  "EZ-Bar Curl":                 { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Dumbbell Curl":               { type: "isolation", tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Incline Dumbbell Curl":       { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Hammer Curl":                 { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Cable Curl":                  { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Hammer Curl (Rope)":    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Preacher Curl":               { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Dumbbell Preacher Curl":      { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Machine Curl":                { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Concentration Curl":          { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Spider Curl":                 { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Bayesian Cable Curl":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Barbell Drag Curl":           { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.010 },
  "High Cable Curl":             { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Overhead Cable Curl":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Single-Arm Cable Curl":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Preacher Curl":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Concentration Curl":    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Low Cable Curl (EZ-Bar)":     { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Zottman Curl":                { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.008 },
  "HS Preacher Curl":            { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.012 },
  "HS Bicep Curl":               { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "HS Iso-Lateral Preacher Curl":{ type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 45, max: 60 },   progression: 0.012 },
  // TRICEPS
  "Triceps Pushdown":            { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Triceps Rope Pushdown":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Cable V-Bar Pushdown":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Single-Arm Cable Pushdown":   { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Reverse-Grip Cable Pushdown": { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Cross-Body Pushdown":   { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Overhead Cable Triceps Extension": { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 }, progression: 0.012 },
  "Overhead Dumbbell Triceps Extension": { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 }, restRange: { min: 60, max: 90 }, progression: 0.008 },
  "Single-Arm Overhead Cable Extension": { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 }, progression: 0.010 },
  "EZ-Bar Skull Crusher":        { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Dumbbell Skull Crusher":      { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.008 },
  "Cable Skull Crusher":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Close-Grip Bench Press":      { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 10 },  restRange: { min: 90, max: 150 },  progression: 0.018 },
  "Dip":                         { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 12 },  restRange: { min: 90, max: 120 },  progression: 0.020 },
  "Machine Dip":                 { type: "compound",  tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 60, max: 90 },   progression: 0.018 },
  "Diamond Push-Up":             { type: "compound",  tier: "moderate", repRange: { min: 8, max: 20 },  restRange: { min: 60, max: 90 },   progression: 0.000 },
  "Kickback":                    { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "JM Press":                    { type: "compound",  tier: "heavy",    repRange: { min: 6, max: 10 },  restRange: { min: 90, max: 120 },  progression: 0.015 },
  "HS Tricep Extension":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "HS Iso-Lateral Tricep Extension": { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 }, progression: 0.012 },
  "HS Dip":                      { type: "compound",  tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.018 },
  // CALVES
  "Standing Calf Raise":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Seated Calf Raise":           { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Leg Press Calf Raise":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Smith Machine Calf Raise":    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Dumbbell Calf Raise":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Barbell Calf Raise":          { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Donkey Calf Raise":           { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Single-Leg Calf Raise":       { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Cable Calf Raise":            { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Tibialis Raise":              { type: "isolation", tier: "moderate", repRange: { min: 12, max: 25 }, restRange: { min: 45, max: 60 },   progression: 0.000 },
  "HS Standing Calf Raise":      { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "HS Seated Calf Raise":        { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  // FOREARMS
  "Wrist Curl":                  { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "Dumbbell Wrist Curl":         { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "Cable Wrist Curl":            { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.010 },
  "Behind-the-Back Wrist Curl":  { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "Reverse Wrist Curl":          { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "Cable Reverse Wrist Curl":    { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.010 },
  "Reverse Barbell Curl":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Reverse Cable Curl":          { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Farmer's Walk":               { type: "compound",  tier: "moderate", repRange: { min: 1, max: 1 },   restRange: { min: 90, max: 120 },  progression: 0.015 },
  "Dead Hang":                   { type: "isolation", tier: "moderate", repRange: { min: 1, max: 1 },   restRange: { min: 60, max: 90 },   progression: 0.000 },
  "Plate Pinch Hold":            { type: "isolation", tier: "moderate", repRange: { min: 1, max: 1 },   restRange: { min: 60, max: 90 },   progression: 0.010 },
  // TRAPS
  "Barbell Shrug":               { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.015 },
  "Dumbbell Shrug":              { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Smith Machine Shrug":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.015 },
  "Cable Shrug":                 { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Trap Bar Shrug":              { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.015 },
  "Machine Shrug":               { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.015 },
  "HS Shrug":                    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.015 },
  "Kettlebell Shrug":            { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.008 },
  "Behind-the-Back Barbell Shrug":{ type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },  progression: 0.012 },
  "Behind-the-Back Cable Shrug": { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Single-Arm Cable Shrug":      { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Overhead Shrug":              { type: "isolation", tier: "moderate", repRange: { min: 8, max: 12 },  restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Rack Pull":                   { type: "compound",  tier: "heavy",    repRange: { min: 3, max: 8 },   restRange: { min: 150, max: 240 }, progression: 0.015 },
  // ABS
  "Cable Crunch":                { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Kneeling Cable Crunch":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Standing Cable Crunch":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Machine Crunch":              { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.015 },
  "HS Crunch":                   { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.015 },
  "Hanging Leg Raise":           { type: "isolation", tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Hanging Knee Raise":          { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Captain's Chair Leg Raise":   { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Ab Wheel Rollout":            { type: "isolation", tier: "moderate", repRange: { min: 8, max: 15 },  restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Decline Sit-Up":              { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Weighted Plank":              { type: "isolation", tier: "moderate", repRange: { min: 1, max: 1 },   restRange: { min: 60, max: 90 },   progression: 0.010 },
  "Pallof Press":                { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Bicycle Crunch":              { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "V-Up":                        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Woodchop":                    { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Dragon Flag":                 { type: "isolation", tier: "heavy",    repRange: { min: 5, max: 10 },  restRange: { min: 60, max: 90 },   progression: 0.000 },
  "Cable Reverse Crunch":        { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Side Bend":             { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Cable Oblique Twist":         { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Low-to-High Cable Chop":      { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "High-to-Low Cable Chop":      { type: "isolation", tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  // NECK
  "Neck Curl (Plate)":           { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "Neck Extension (Plate)":      { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.008 },
  "Neck Harness Extension":      { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.010 },
  "Band Neck Flexion":           { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Band Neck Extension":         { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  // ADDUCTORS
  "Machine Hip Adduction":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Cable Hip Adduction":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Band Hip Adduction":          { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Copenhagen Plank":            { type: "isolation", tier: "moderate", repRange: { min: 1, max: 1 },   restRange: { min: 45, max: 60 },   progression: 0.000 },
  "Sumo Squat":                  { type: "compound",  tier: "moderate", repRange: { min: 10, max: 15 }, restRange: { min: 60, max: 90 },   progression: 0.012 },
  "Side-Lying Adduction":        { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  // ABDUCTORS
  "Machine Hip Abduction":       { type: "isolation", tier: "moderate", repRange: { min: 10, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.012 },
  "Cable Hip Abduction":         { type: "isolation", tier: "moderate", repRange: { min: 12, max: 20 }, restRange: { min: 45, max: 60 },   progression: 0.010 },
  "Band Clamshell":              { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Banded Side Walk":            { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Side-Lying Hip Abduction":    { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Fire Hydrant":                { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
  "Banded Squat Walk":           { type: "isolation", tier: "light",    repRange: { min: 15, max: 25 }, restRange: { min: 30, max: 45 },   progression: 0.000 },
};

const DEFAULT_PROFILE = {
  type: "isolation", tier: "moderate",
  repRange: { min: 8, max: 15 },
  restRange: { min: 60, max: 90 },
  progression: 0.012,
};

export function getProfile(exerciseName) {
  return EXERCISE_PROFILES[exerciseName] || DEFAULT_PROFILE;
}

export function suggestReps(exerciseName, isDeload = false) {
  const p = getProfile(exerciseName);
  if (isDeload) {
    return {
      min: p.repRange.min + 5,
      max: p.repRange.max + 5,
      label: `${p.repRange.min + 5}–${p.repRange.max + 5}`,
    };
  }
  return {
    min: p.repRange.min,
    max: p.repRange.max,
    label: `${p.repRange.min}–${p.repRange.max}`,
  };
}

export function suggestRest(exerciseName) {
  const p = getProfile(exerciseName);
  return {
    min: p.restRange.min,
    max: p.restRange.max,
    label: `${Math.round(p.restRange.min / 60 * 10) / 10}–${Math.round(p.restRange.max / 60 * 10) / 10} min`,
  };
}


export const EXERCISE_SUBSTITUTES = {

  // ════════════════════════════════════════════════════════════
  // CHEST
  // ════════════════════════════════════════════════════════════

  // ── Flat press ──
  "Barbell Bench Press": [
    "Dumbbell Bench Press",
    "Machine Chest Press",
    "Smith Machine Bench Press",
    "HS Iso-Lateral Bench Press",
    "HS Seated Chest Press",
    "HS Wide Chest Press",
    "Dip (Chest)",
    "Push-Up",
    "Standing Cable Chest Press",
  ],
  "Dumbbell Bench Press": [
    "Barbell Bench Press",
    "Machine Chest Press",
    "Smith Machine Bench Press",
    "HS Iso-Lateral Bench Press",
    "HS Seated Chest Press",
    "HS Wide Chest Press",
    "Dip (Chest)",
    "Push-Up",
    "Standing Cable Chest Press",
  ],
  "Machine Chest Press": [
    "Barbell Bench Press",
    "Dumbbell Bench Press",
    "Smith Machine Bench Press",
    "HS Iso-Lateral Bench Press",
    "HS Seated Chest Press",
    "HS Wide Chest Press",
    "Standing Cable Chest Press",
    "Dip (Chest)",
    "Push-Up",
  ],
  "Smith Machine Bench Press": [
    "Barbell Bench Press",
    "Dumbbell Bench Press",
    "Machine Chest Press",
    "HS Iso-Lateral Bench Press",
    "HS Seated Chest Press",
    "HS Wide Chest Press",
    "Dip (Chest)",
    "Push-Up",
  ],
  "HS Iso-Lateral Bench Press": [
    "HS Seated Chest Press",
    "HS Wide Chest Press",
    "Machine Chest Press",
    "Barbell Bench Press",
    "Dumbbell Bench Press",
    "Smith Machine Bench Press",
    "Dip (Chest)",
  ],
  "HS Seated Chest Press": [
    "HS Iso-Lateral Bench Press",
    "HS Wide Chest Press",
    "Machine Chest Press",
    "Barbell Bench Press",
    "Dumbbell Bench Press",
    "Smith Machine Bench Press",
  ],
  "HS Wide Chest Press": [
    "HS Iso-Lateral Bench Press",
    "HS Seated Chest Press",
    "Machine Chest Press",
    "Dumbbell Bench Press",
    "Barbell Bench Press",
    "Smith Machine Bench Press",
  ],
  "Standing Cable Chest Press": [
    "Machine Chest Press",
    "Dumbbell Bench Press",
    "Push-Up",
    "Barbell Bench Press",
    "Smith Machine Bench Press",
  ],
  "Svend Press": [
    "Cable Fly",
    "Pec Deck",
    "Standing Cable Chest Press",
    "Cable Crossover",
    "Push-Up",
  ],
  "Push-Up": [
    "Dumbbell Bench Press",
    "Machine Chest Press",
    "Barbell Bench Press",
    "Standing Cable Chest Press",
    "Dip (Chest)",
  ],
  "Dip (Chest)": [
    "Machine Dip",
    "Decline Barbell Bench Press",
    "Decline Dumbbell Press",
    "HS Iso-Lateral Decline Press",
    "Dumbbell Bench Press",
    "Push-Up",
    "Barbell Bench Press",
  ],

  // ── Incline press ──
  "Incline Barbell Bench Press": [
    "Incline Dumbbell Press",
    "Smith Machine Incline Press",
    "Machine Incline Press",
    "HS Iso-Lateral Incline Press",
    "Low-to-High Cable Fly",
    "Landmine Press",
  ],
  "Incline Dumbbell Press": [
    "Incline Barbell Bench Press",
    "Smith Machine Incline Press",
    "Machine Incline Press",
    "HS Iso-Lateral Incline Press",
    "Low-to-High Cable Fly",
    "Landmine Press",
  ],
  "Smith Machine Incline Press": [
    "Incline Barbell Bench Press",
    "Incline Dumbbell Press",
    "Machine Incline Press",
    "HS Iso-Lateral Incline Press",
    "Low-to-High Cable Fly",
  ],
  "Machine Incline Press": [
    "Incline Dumbbell Press",
    "Incline Barbell Bench Press",
    "Smith Machine Incline Press",
    "HS Iso-Lateral Incline Press",
    "Low-to-High Cable Fly",
  ],
  "HS Iso-Lateral Incline Press": [
    "Machine Incline Press",
    "Incline Dumbbell Press",
    "Incline Barbell Bench Press",
    "Smith Machine Incline Press",
    "Low-to-High Cable Fly",
  ],

  // ── Decline press ──
  "Decline Barbell Bench Press": [
    "Decline Dumbbell Press",
    "HS Iso-Lateral Decline Press",
    "Dip (Chest)",
    "Machine Dip",
    "High-to-Low Cable Fly",
  ],
  "Decline Dumbbell Press": [
    "Decline Barbell Bench Press",
    "HS Iso-Lateral Decline Press",
    "Dip (Chest)",
    "Machine Dip",
    "High-to-Low Cable Fly",
  ],
  "HS Iso-Lateral Decline Press": [
    "Decline Barbell Bench Press",
    "Decline Dumbbell Press",
    "Dip (Chest)",
    "Machine Dip",
    "High-to-Low Cable Fly",
  ],

  // ── Fly / isolation ──
  "Cable Fly": [
    "Pec Deck",
    "Dumbbell Fly",
    "Cable Crossover",
    "Single-Arm Cable Fly",
    "Incline Cable Fly",
    "Low-to-High Cable Fly",
    "High-to-Low Cable Fly",
    "Incline Dumbbell Fly",
    "Svend Press",
  ],
  "Dumbbell Fly": [
    "Cable Fly",
    "Pec Deck",
    "Incline Dumbbell Fly",
    "Cable Crossover",
    "Single-Arm Cable Fly",
  ],
  "Pec Deck": [
    "Cable Fly",
    "Cable Crossover",
    "Dumbbell Fly",
    "Single-Arm Cable Fly",
    "Machine Chest Press",
  ],
  "Cable Crossover": [
    "Cable Fly",
    "Pec Deck",
    "Single-Arm Cable Fly",
    "High-to-Low Cable Fly",
    "Low-to-High Cable Fly",
    "Dumbbell Fly",
  ],
  "Single-Arm Cable Fly": [
    "Cable Fly",
    "Cable Crossover",
    "Pec Deck",
    "Dumbbell Fly",
  ],
  "Incline Cable Fly": [
    "Low-to-High Cable Fly",
    "Incline Dumbbell Fly",
    "Cable Fly",
    "Pec Deck",
  ],
  "Low-to-High Cable Fly": [
    "Incline Cable Fly",
    "Incline Dumbbell Fly",
    "Cable Fly",
    "Pec Deck",
  ],
  "High-to-Low Cable Fly": [
    "Cable Crossover",
    "Cable Fly",
    "Decline Dumbbell Press",
    "Dip (Chest)",
    "Pec Deck",
  ],
  "Incline Dumbbell Fly": [
    "Incline Cable Fly",
    "Low-to-High Cable Fly",
    "Cable Fly",
    "Dumbbell Fly",
    "Pec Deck",
  ],

  // ── Other chest ──
  "Landmine Press": [
    "Incline Dumbbell Press",
    "Machine Incline Press",
    "Smith Machine Incline Press",
    "Cable Shoulder Press",
  ],

  // ════════════════════════════════════════════════════════════
  // BACK
  // ════════════════════════════════════════════════════════════

  // ── Vertical pull ──
  "Pull-Up": [
    "Chin-Up",
    "Lat Pulldown",
    "Neutral-Grip Lat Pulldown",
    "Close-Grip Lat Pulldown",
    "Single-Arm Lat Pulldown",
    "HS Lat Pulldown",
    "HS Iso-Lateral Front Lat Pulldown",
    "Behind-the-Neck Lat Pulldown",
    "Reverse-Grip Lat Pulldown",
  ],
  "Chin-Up": [
    "Pull-Up",
    "Reverse-Grip Lat Pulldown",
    "Lat Pulldown",
    "Close-Grip Lat Pulldown",
    "Neutral-Grip Lat Pulldown",
    "HS Lat Pulldown",
  ],
  "Lat Pulldown": [
    "Pull-Up",
    "Chin-Up",
    "Neutral-Grip Lat Pulldown",
    "Close-Grip Lat Pulldown",
    "Single-Arm Lat Pulldown",
    "Reverse-Grip Lat Pulldown",
    "Behind-the-Neck Lat Pulldown",
    "HS Lat Pulldown",
    "HS Iso-Lateral Front Lat Pulldown",
  ],
  "Close-Grip Lat Pulldown": [
    "Neutral-Grip Lat Pulldown",
    "Lat Pulldown",
    "Chin-Up",
    "Reverse-Grip Lat Pulldown",
    "Single-Arm Lat Pulldown",
    "HS Lat Pulldown",
  ],
  "Neutral-Grip Lat Pulldown": [
    "Close-Grip Lat Pulldown",
    "Lat Pulldown",
    "Chin-Up",
    "Pull-Up",
    "Single-Arm Lat Pulldown",
    "HS Lat Pulldown",
  ],
  "Single-Arm Lat Pulldown": [
    "Lat Pulldown",
    "Neutral-Grip Lat Pulldown",
    "Close-Grip Lat Pulldown",
    "Pull-Up",
    "HS Iso-Lateral Front Lat Pulldown",
  ],
  "Behind-the-Neck Lat Pulldown": [
    "Lat Pulldown",
    "Pull-Up",
    "Neutral-Grip Lat Pulldown",
    "HS Lat Pulldown",
  ],
  "Reverse-Grip Lat Pulldown": [
    "Chin-Up",
    "Close-Grip Lat Pulldown",
    "Lat Pulldown",
    "Neutral-Grip Lat Pulldown",
    "HS Lat Pulldown",
  ],
  "HS Lat Pulldown": [
    "HS Iso-Lateral Front Lat Pulldown",
    "Lat Pulldown",
    "Neutral-Grip Lat Pulldown",
    "Pull-Up",
    "Close-Grip Lat Pulldown",
  ],
  "HS Iso-Lateral Front Lat Pulldown": [
    "HS Lat Pulldown",
    "Single-Arm Lat Pulldown",
    "Lat Pulldown",
    "Pull-Up",
    "Neutral-Grip Lat Pulldown",
  ],

  // ── Horizontal row ──
  "Barbell Row": [
    "Pendlay Row",
    "Dumbbell Row",
    "T-Bar Row",
    "Smith Machine Row",
    "Cable Row",
    "Seated Cable Row",
    "Machine Row",
    "Chest-Supported Row",
    "Seal Row",
    "Meadows Row",
    "HS Iso-Lateral Row",
    "HS DY Row",
    "HS Seated Row",
    "Inverted Row",
  ],
  "Pendlay Row": [
    "Barbell Row",
    "T-Bar Row",
    "Dumbbell Row",
    "Smith Machine Row",
    "Seal Row",
    "Chest-Supported Row",
  ],
  "Dumbbell Row": [
    "Barbell Row",
    "Cable Row",
    "Machine Row",
    "Meadows Row",
    "Single-Arm Cable Row",
    "Chest-Supported Row",
    "T-Bar Row",
    "HS Iso-Lateral Row",
    "Smith Machine Row",
  ],
  "T-Bar Row": [
    "Barbell Row",
    "Pendlay Row",
    "Seal Row",
    "Chest-Supported Row",
    "Dumbbell Row",
    "Machine Row",
    "HS DY Row",
    "HS Iso-Lateral Row",
  ],
  "Cable Row": [
    "Seated Cable Row",
    "V-Bar Cable Row",
    "Wide-Grip Cable Row",
    "Single-Arm Cable Row",
    "Machine Row",
    "Dumbbell Row",
    "Barbell Row",
    "HS Seated Row",
    "HS Iso-Lateral Seated Row",
  ],
  "Seated Cable Row": [
    "Cable Row",
    "V-Bar Cable Row",
    "Wide-Grip Cable Row",
    "Machine Row",
    "HS Seated Row",
    "HS Iso-Lateral Seated Row",
    "Dumbbell Row",
    "Barbell Row",
  ],
  "Machine Row": [
    "Cable Row",
    "Seated Cable Row",
    "HS Iso-Lateral Row",
    "HS Seated Row",
    "Chest-Supported Row",
    "Dumbbell Row",
    "Barbell Row",
  ],
  "Chest-Supported Row": [
    "Seal Row",
    "Machine Row",
    "Cable Row",
    "Dumbbell Row",
    "T-Bar Row",
    "HS Iso-Lateral Row",
    "Barbell Row",
  ],
  "Seal Row": [
    "Chest-Supported Row",
    "Machine Row",
    "T-Bar Row",
    "Cable Row",
    "Barbell Row",
    "Dumbbell Row",
    "HS Iso-Lateral Row",
  ],
  "Smith Machine Row": [
    "Barbell Row",
    "Pendlay Row",
    "T-Bar Row",
    "Machine Row",
    "Dumbbell Row",
    "Cable Row",
  ],
  "Meadows Row": [
    "Dumbbell Row",
    "Single-Arm Cable Row",
    "Barbell Row",
    "T-Bar Row",
    "Cable Row",
  ],
  "Single-Arm Cable Row": [
    "Dumbbell Row",
    "Meadows Row",
    "Cable Row",
    "Machine Row",
    "Barbell Row",
  ],
  "V-Bar Cable Row": [
    "Seated Cable Row",
    "Cable Row",
    "Close-Grip Lat Pulldown",
    "Machine Row",
    "HS Seated Row",
  ],
  "Wide-Grip Cable Row": [
    "Seated Cable Row",
    "Cable Row",
    "Barbell Row",
    "Machine Row",
    "HS Iso-Lateral Row",
  ],
  "Inverted Row": [
    "Cable Row",
    "Machine Row",
    "Dumbbell Row",
    "Barbell Row",
    "Seated Cable Row",
  ],
  "HS Iso-Lateral Row": [
    "HS DY Row",
    "HS Iso-Lateral High Row",
    "HS Iso-Lateral Low Row",
    "HS Seated Row",
    "Machine Row",
    "Cable Row",
    "Dumbbell Row",
    "Barbell Row",
  ],
  "HS Iso-Lateral High Row": [
    "HS Iso-Lateral Row",
    "HS DY Row",
    "Machine Row",
    "Cable Row",
    "Barbell Row",
    "Dumbbell Row",
  ],
  "HS Iso-Lateral Low Row": [
    "HS Iso-Lateral Row",
    "HS DY Row",
    "HS Seated Row",
    "Cable Row",
    "Machine Row",
    "Dumbbell Row",
  ],
  "HS DY Row": [
    "HS Iso-Lateral Row",
    "HS Iso-Lateral High Row",
    "T-Bar Row",
    "Machine Row",
    "Barbell Row",
    "Cable Row",
  ],
  "HS Seated Row": [
    "HS Iso-Lateral Seated Row",
    "HS Iso-Lateral Row",
    "Machine Row",
    "Seated Cable Row",
    "Cable Row",
    "Dumbbell Row",
  ],
  "HS Iso-Lateral Seated Row": [
    "HS Seated Row",
    "HS Iso-Lateral Row",
    "Machine Row",
    "Seated Cable Row",
    "Cable Row",
  ],

  // ── Pullover / straight-arm ──
  "Straight-Arm Pulldown": [
    "Cable Pullover",
    "Kneeling Cable Pullover",
    "Lat Pulldown",
  ],
  "Cable Pullover": [
    "Straight-Arm Pulldown",
    "Kneeling Cable Pullover",
    "Lat Pulldown",
  ],
  "Kneeling Cable Pullover": [
    "Cable Pullover",
    "Straight-Arm Pulldown",
    "Lat Pulldown",
  ],

  // ════════════════════════════════════════════════════════════
  // QUADS
  // ════════════════════════════════════════════════════════════

  // ── Squat pattern ──
  "Back Squat": [
    "Front Squat",
    "Hack Squat",
    "Smith Machine Squat",
    "Belt Squat",
    "Pendulum Squat",
    "V-Squat",
    "HS V-Squat",
    "Leg Press",
    "Goblet Squat",
    "Cable Squat",
    "Sissy Squat",
  ],
  "Front Squat": [
    "Back Squat",
    "Hack Squat",
    "Goblet Squat",
    "Pendulum Squat",
    "Smith Machine Squat",
    "Belt Squat",
    "V-Squat",
    "HS V-Squat",
    "Leg Press",
    "Sissy Squat",
  ],
  "Hack Squat": [
    "Pendulum Squat",
    "V-Squat",
    "HS V-Squat",
    "Back Squat",
    "Front Squat",
    "Smith Machine Squat",
    "Belt Squat",
    "Leg Press",
  ],
  "Smith Machine Squat": [
    "Back Squat",
    "Hack Squat",
    "Front Squat",
    "Belt Squat",
    "Pendulum Squat",
    "V-Squat",
    "Leg Press",
  ],
  "Goblet Squat": [
    "Front Squat",
    "Back Squat",
    "Belt Squat",
    "Cable Squat",
    "Hack Squat",
    "Smith Machine Squat",
  ],
  "Belt Squat": [
    "Hack Squat",
    "Pendulum Squat",
    "V-Squat",
    "Back Squat",
    "Smith Machine Squat",
    "Leg Press",
  ],
  "Pendulum Squat": [
    "Hack Squat",
    "V-Squat",
    "Belt Squat",
    "HS V-Squat",
    "Back Squat",
    "Leg Press",
  ],
  "V-Squat": [
    "Hack Squat",
    "Pendulum Squat",
    "HS V-Squat",
    "Belt Squat",
    "Back Squat",
    "Leg Press",
  ],
  "HS V-Squat": [
    "V-Squat",
    "Hack Squat",
    "Pendulum Squat",
    "Belt Squat",
    "HS Leg Press",
    "Back Squat",
  ],
  "Sissy Squat": [
    "Leg Extension",
    "Cable Leg Extension",
    "HS Leg Extension",
    "Front Squat",
    "Hack Squat",
  ],
  "Cable Squat": [
    "Goblet Squat",
    "Belt Squat",
    "Back Squat",
    "Front Squat",
    "Leg Press",
  ],

  // ── Leg press ──
  "Leg Press": [
    "Hack Squat",
    "HS Leg Press",
    "HS Linear Leg Press",
    "Back Squat",
    "Belt Squat",
    "V-Squat",
    "Smith Machine Squat",
    "Pendulum Squat",
    "Wide-Stance Leg Press",
  ],
  "HS Leg Press": [
    "Leg Press",
    "HS Linear Leg Press",
    "Hack Squat",
    "Back Squat",
    "Belt Squat",
    "V-Squat",
  ],
  "HS Linear Leg Press": [
    "HS Leg Press",
    "Leg Press",
    "Hack Squat",
    "Back Squat",
    "Belt Squat",
  ],
  "Wide-Stance Leg Press": [
    "Leg Press",
    "Sumo Squat",
    "HS Leg Press",
    "Hack Squat",
    "Back Squat",
  ],

  // ── Leg extension ──
  "Leg Extension": [
    "Cable Leg Extension",
    "HS Leg Extension",
    "Sissy Squat",
  ],
  "Cable Leg Extension": [
    "Leg Extension",
    "HS Leg Extension",
    "Sissy Squat",
  ],
  "HS Leg Extension": [
    "Leg Extension",
    "Cable Leg Extension",
    "Sissy Squat",
  ],

  // ── Lunge ──
  "Barbell Lunge": [
    "Dumbbell Lunge",
    "Walking Lunge",
    "Step-Up",
    "Bulgarian Split Squat",
    "Reverse Lunge",
    "HS Squat Lunge",
  ],
  "Dumbbell Lunge": [
    "Barbell Lunge",
    "Walking Lunge",
    "Step-Up",
    "Bulgarian Split Squat",
    "Reverse Lunge",
    "HS Squat Lunge",
  ],
  "Walking Lunge": [
    "Dumbbell Lunge",
    "Barbell Lunge",
    "Step-Up",
    "Bulgarian Split Squat",
    "Reverse Lunge",
  ],
  "Step-Up": [
    "Dumbbell Lunge",
    "Walking Lunge",
    "Barbell Lunge",
    "Bulgarian Split Squat",
    "HS Squat Lunge",
  ],
  "HS Squat Lunge": [
    "Dumbbell Lunge",
    "Barbell Lunge",
    "Walking Lunge",
    "Step-Up",
    "Bulgarian Split Squat",
  ],

  // ════════════════════════════════════════════════════════════
  // HAMSTRINGS
  // ════════════════════════════════════════════════════════════

  // ── Hip hinge ──
  "Romanian Deadlift": [
    "Dumbbell Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Cable Romanian Deadlift",
    "Good Morning",
    "Dumbbell Good Morning",
    "Cable Pull-Through",
    "Single-Leg Romanian Deadlift",
    "Kettlebell Swing",
  ],
  "Dumbbell Romanian Deadlift": [
    "Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Single-Leg Romanian Deadlift",
    "Cable Romanian Deadlift",
    "Good Morning",
    "Dumbbell Good Morning",
    "Cable Pull-Through",
  ],
  "Stiff-Leg Deadlift": [
    "Romanian Deadlift",
    "Dumbbell Romanian Deadlift",
    "Cable Romanian Deadlift",
    "Good Morning",
    "Dumbbell Good Morning",
    "Cable Pull-Through",
    "Single-Leg Romanian Deadlift",
  ],
  "Good Morning": [
    "Stiff-Leg Deadlift",
    "Romanian Deadlift",
    "Dumbbell Good Morning",
    "Cable Pull-Through",
    "Dumbbell Romanian Deadlift",
  ],
  "Dumbbell Good Morning": [
    "Good Morning",
    "Dumbbell Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Cable Pull-Through",
    "Romanian Deadlift",
  ],
  "Cable Pull-Through": [
    "Romanian Deadlift",
    "Dumbbell Romanian Deadlift",
    "Good Morning",
    "Cable Romanian Deadlift",
    "Kettlebell Swing",
    "Hip Thrust",
  ],
  "Cable Romanian Deadlift": [
    "Romanian Deadlift",
    "Dumbbell Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Cable Pull-Through",
    "Good Morning",
  ],
  "Single-Leg Romanian Deadlift": [
    "Dumbbell Romanian Deadlift",
    "Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Cable Romanian Deadlift",
  ],
  "Kettlebell Swing": [
    "Cable Pull-Through",
    "Romanian Deadlift",
    "Good Morning",
    "Hip Thrust",
    "Glute-Ham Raise",
  ],

  // ── Leg curl ──
  "Lying Leg Curl": [
    "Seated Leg Curl",
    "Standing Leg Curl",
    "HS Lying Leg Curl",
    "HS Seated Leg Curl",
    "HS Kneeling Leg Curl",
    "Cable Leg Curl",
    "Band Leg Curl",
    "Nordic Hamstring Curl",
    "Glute-Ham Raise",
  ],
  "Seated Leg Curl": [
    "Lying Leg Curl",
    "Standing Leg Curl",
    "HS Seated Leg Curl",
    "HS Lying Leg Curl",
    "HS Kneeling Leg Curl",
    "Cable Leg Curl",
    "Band Leg Curl",
    "Nordic Hamstring Curl",
  ],
  "Standing Leg Curl": [
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Cable Leg Curl",
    "HS Kneeling Leg Curl",
    "HS Lying Leg Curl",
    "HS Seated Leg Curl",
  ],
  "Cable Leg Curl": [
    "Standing Leg Curl",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Band Leg Curl",
  ],
  "Band Leg Curl": [
    "Cable Leg Curl",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Standing Leg Curl",
  ],
  "Nordic Hamstring Curl": [
    "Glute-Ham Raise",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "HS Lying Leg Curl",
  ],
  "Glute-Ham Raise": [
    "Nordic Hamstring Curl",
    "Lying Leg Curl",
    "Seated Leg Curl",
    "Romanian Deadlift",
  ],
  "HS Lying Leg Curl": [
    "Lying Leg Curl",
    "HS Seated Leg Curl",
    "HS Kneeling Leg Curl",
    "Seated Leg Curl",
    "Standing Leg Curl",
  ],
  "HS Seated Leg Curl": [
    "Seated Leg Curl",
    "HS Lying Leg Curl",
    "HS Kneeling Leg Curl",
    "Lying Leg Curl",
    "Standing Leg Curl",
  ],
  "HS Kneeling Leg Curl": [
    "HS Lying Leg Curl",
    "HS Seated Leg Curl",
    "Standing Leg Curl",
    "Lying Leg Curl",
    "Seated Leg Curl",
  ],

  // ════════════════════════════════════════════════════════════
  // GLUTES
  // ════════════════════════════════════════════════════════════

  "Hip Thrust": [
    "Smith Machine Hip Thrust",
    "Dumbbell Hip Thrust",
    "Band Hip Thrust",
    "HS Hip Thrust",
    "Glute Bridge",
    "Single-Leg Hip Thrust",
    "Cable Pull-Through (Glutes)",
    "Cable Hip Extension",
  ],
  "Smith Machine Hip Thrust": [
    "Hip Thrust",
    "Dumbbell Hip Thrust",
    "HS Hip Thrust",
    "Glute Bridge",
    "Band Hip Thrust",
  ],
  "Dumbbell Hip Thrust": [
    "Hip Thrust",
    "Smith Machine Hip Thrust",
    "Glute Bridge",
    "Band Hip Thrust",
    "Single-Leg Hip Thrust",
  ],
  "Band Hip Thrust": [
    "Hip Thrust",
    "Dumbbell Hip Thrust",
    "Glute Bridge",
    "Single-Leg Hip Thrust",
    "Cable Hip Extension",
  ],
  "HS Hip Thrust": [
    "Hip Thrust",
    "Smith Machine Hip Thrust",
    "Machine Glute Kickback",
    "HS Glute Kickback",
  ],
  "Glute Bridge": [
    "Hip Thrust",
    "Dumbbell Hip Thrust",
    "Single-Leg Hip Thrust",
    "Band Hip Thrust",
    "Cable Hip Extension",
  ],
  "Single-Leg Hip Thrust": [
    "Glute Bridge",
    "Hip Thrust",
    "Dumbbell Hip Thrust",
    "Band Hip Thrust",
    "Cable Kickback",
  ],
  "Bulgarian Split Squat": [
    "Reverse Lunge",
    "Dumbbell Lunge",
    "Walking Lunge",
    "Step-Up",
    "Barbell Lunge",
    "Cable Kickback",
    "Single-Leg Romanian Deadlift",
  ],
  "Reverse Lunge": [
    "Bulgarian Split Squat",
    "Dumbbell Lunge",
    "Walking Lunge",
    "Step-Up",
    "Barbell Lunge",
  ],
  "Cable Kickback": [
    "Cable Donkey Kick",
    "Machine Glute Kickback",
    "HS Glute Kickback",
    "Cable Hip Extension",
    "Single-Leg Hip Thrust",
  ],
  "Cable Donkey Kick": [
    "Cable Kickback",
    "Machine Glute Kickback",
    "HS Glute Kickback",
    "Cable Hip Extension",
  ],
  "Machine Glute Kickback": [
    "Cable Kickback",
    "Cable Donkey Kick",
    "HS Glute Kickback",
    "Cable Hip Extension",
  ],
  "HS Glute Kickback": [
    "Machine Glute Kickback",
    "Cable Kickback",
    "Cable Donkey Kick",
    "Cable Hip Extension",
  ],
  "Cable Pull-Through (Glutes)": [
    "Hip Thrust",
    "Cable Hip Extension",
    "Kettlebell Swing",
    "Glute Bridge",
    "Cable Pull-Through",
  ],
  "Cable Hip Extension": [
    "Cable Kickback",
    "Cable Donkey Kick",
    "Cable Pull-Through (Glutes)",
    "Machine Glute Kickback",
    "Hip Thrust",
  ],
  "Sumo Deadlift": [
    "Hip Thrust",
    "Romanian Deadlift",
    "Cable Pull-Through (Glutes)",
    "Sumo Squat",
    "Glute Bridge",
  ],

  // ════════════════════════════════════════════════════════════
  // SHOULDERS (SIDE DELTS)
  // ════════════════════════════════════════════════════════════

  "Dumbbell Lateral Raise": [
    "Cable Lateral Raise",
    "Machine Lateral Raise",
    "Behind-the-Back Cable Lateral Raise",
    "Leaning Dumbbell Lateral Raise",
    "Cross-Body Cable Lateral Raise",
    "HS Lateral Raise",
    "Band Lateral Raise",
    "Kettlebell Lateral Raise",
    "Incline Dumbbell Y-Raise",
    "Lu Raise",
    "Cable W-Raise",
    "Dumbbell Upright Row",
    "Cable Upright Row",
    "Barbell Upright Row",
  ],
  "Cable Lateral Raise": [
    "Dumbbell Lateral Raise",
    "Behind-the-Back Cable Lateral Raise",
    "Cross-Body Cable Lateral Raise",
    "Machine Lateral Raise",
    "HS Lateral Raise",
    "Cable W-Raise",
    "Leaning Dumbbell Lateral Raise",
    "Band Lateral Raise",
    "Cable Upright Row",
  ],
  "Machine Lateral Raise": [
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "HS Lateral Raise",
    "Behind-the-Back Cable Lateral Raise",
    "Leaning Dumbbell Lateral Raise",
    "Band Lateral Raise",
  ],
  "Behind-the-Back Cable Lateral Raise": [
    "Cable Lateral Raise",
    "Cross-Body Cable Lateral Raise",
    "Dumbbell Lateral Raise",
    "Machine Lateral Raise",
    "HS Lateral Raise",
  ],
  "Leaning Dumbbell Lateral Raise": [
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "Behind-the-Back Cable Lateral Raise",
    "Machine Lateral Raise",
    "HS Lateral Raise",
  ],
  "Cross-Body Cable Lateral Raise": [
    "Behind-the-Back Cable Lateral Raise",
    "Cable Lateral Raise",
    "Dumbbell Lateral Raise",
    "Machine Lateral Raise",
  ],
  "HS Lateral Raise": [
    "Machine Lateral Raise",
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "Leaning Dumbbell Lateral Raise",
    "Behind-the-Back Cable Lateral Raise",
  ],
  "Band Lateral Raise": [
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "Machine Lateral Raise",
    "Leaning Dumbbell Lateral Raise",
  ],
  "Kettlebell Lateral Raise": [
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "Machine Lateral Raise",
    "Leaning Dumbbell Lateral Raise",
  ],
  "Lu Raise": [
    "Dumbbell Lateral Raise",
    "Incline Dumbbell Y-Raise",
    "Cable Lateral Raise",
    "Cable W-Raise",
  ],
  "Incline Dumbbell Y-Raise": [
    "Lu Raise",
    "Dumbbell Lateral Raise",
    "Cable W-Raise",
    "Cable Lateral Raise",
  ],
  "Cable W-Raise": [
    "Cable Lateral Raise",
    "Incline Dumbbell Y-Raise",
    "Lu Raise",
    "Dumbbell Lateral Raise",
  ],
  "Dumbbell Upright Row": [
    "Cable Upright Row",
    "Barbell Upright Row",
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
    "Machine Lateral Raise",
  ],
  "Cable Upright Row": [
    "Dumbbell Upright Row",
    "Barbell Upright Row",
    "Cable Lateral Raise",
    "Dumbbell Lateral Raise",
    "Machine Lateral Raise",
  ],
  "Barbell Upright Row": [
    "Dumbbell Upright Row",
    "Cable Upright Row",
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise",
  ],

  // ════════════════════════════════════════════════════════════
  // SHOULDERS (REAR DELTS)
  // ════════════════════════════════════════════════════════════

  "Reverse Pec Deck": [
    "Machine Reverse Fly",
    "Face Pull",
    "Cable Reverse Fly",
    "Dumbbell Reverse Fly",
    "Incline Dumbbell Reverse Fly",
    "Chest-Supported Reverse Fly",
    "High Cable Reverse Fly",
    "Single-Arm Cable Reverse Fly",
    "Rear Delt Cable Pull",
    "Band Pull-Apart",
    "Wide-Grip Cable Row (Rear Delt)",
    "Kneeling Cable Face Pull",
  ],
  "Face Pull": [
    "Reverse Pec Deck",
    "Cable Reverse Fly",
    "Kneeling Cable Face Pull",
    "Band Pull-Apart",
    "Dumbbell Reverse Fly",
    "High Cable Reverse Fly",
    "Machine Reverse Fly",
    "Rear Delt Cable Pull",
    "Wide-Grip Cable Row (Rear Delt)",
    "Incline Dumbbell Reverse Fly",
    "Chest-Supported Reverse Fly",
    "Single-Arm Cable Reverse Fly",
  ],
  "Dumbbell Reverse Fly": [
    "Incline Dumbbell Reverse Fly",
    "Chest-Supported Reverse Fly",
    "Reverse Pec Deck",
    "Cable Reverse Fly",
    "Machine Reverse Fly",
    "Face Pull",
    "Band Pull-Apart",
    "High Cable Reverse Fly",
  ],
  "Incline Dumbbell Reverse Fly": [
    "Chest-Supported Reverse Fly",
    "Dumbbell Reverse Fly",
    "Reverse Pec Deck",
    "Cable Reverse Fly",
    "Machine Reverse Fly",
    "Face Pull",
  ],
  "Chest-Supported Reverse Fly": [
    "Incline Dumbbell Reverse Fly",
    "Dumbbell Reverse Fly",
    "Reverse Pec Deck",
    "Machine Reverse Fly",
    "Cable Reverse Fly",
  ],
  "Cable Reverse Fly": [
    "Reverse Pec Deck",
    "Machine Reverse Fly",
    "High Cable Reverse Fly",
    "Single-Arm Cable Reverse Fly",
    "Dumbbell Reverse Fly",
    "Face Pull",
    "Rear Delt Cable Pull",
  ],
  "High Cable Reverse Fly": [
    "Cable Reverse Fly",
    "Single-Arm Cable Reverse Fly",
    "Reverse Pec Deck",
    "Face Pull",
    "Dumbbell Reverse Fly",
  ],
  "Single-Arm Cable Reverse Fly": [
    "Cable Reverse Fly",
    "High Cable Reverse Fly",
    "Reverse Pec Deck",
    "Dumbbell Reverse Fly",
    "Face Pull",
  ],
  "Machine Reverse Fly": [
    "Reverse Pec Deck",
    "Cable Reverse Fly",
    "Dumbbell Reverse Fly",
    "Face Pull",
    "High Cable Reverse Fly",
  ],
  "Band Pull-Apart": [
    "Face Pull",
    "Reverse Pec Deck",
    "Dumbbell Reverse Fly",
    "Cable Reverse Fly",
    "Kneeling Cable Face Pull",
  ],
  "Rear Delt Cable Pull": [
    "Face Pull",
    "Cable Reverse Fly",
    "Reverse Pec Deck",
    "Wide-Grip Cable Row (Rear Delt)",
    "High Cable Reverse Fly",
  ],
  "Kneeling Cable Face Pull": [
    "Face Pull",
    "Reverse Pec Deck",
    "Cable Reverse Fly",
    "Band Pull-Apart",
    "Dumbbell Reverse Fly",
  ],
  "Wide-Grip Cable Row (Rear Delt)": [
    "Face Pull",
    "Rear Delt Cable Pull",
    "Reverse Pec Deck",
    "Cable Reverse Fly",
    "Dumbbell Reverse Fly",
  ],

  // ════════════════════════════════════════════════════════════
  // SHOULDERS (FRONT DELTS)
  // ════════════════════════════════════════════════════════════

  "Overhead Press": [
    "Seated Barbell Press",
    "Dumbbell Shoulder Press",
    "Arnold Press",
    "Machine Shoulder Press",
    "Smith Machine Overhead Press",
    "HS Shoulder Press",
    "HS Iso-Lateral Shoulder Press",
    "HS Military Press",
    "Cable Shoulder Press",
    "Landmine Press",
  ],
  "Seated Barbell Press": [
    "Overhead Press",
    "Smith Machine Overhead Press",
    "Machine Shoulder Press",
    "Dumbbell Shoulder Press",
    "HS Shoulder Press",
    "HS Military Press",
  ],
  "Dumbbell Shoulder Press": [
    "Arnold Press",
    "Overhead Press",
    "Machine Shoulder Press",
    "Smith Machine Overhead Press",
    "HS Shoulder Press",
    "HS Iso-Lateral Shoulder Press",
    "Seated Barbell Press",
    "Cable Shoulder Press",
  ],
  "Arnold Press": [
    "Dumbbell Shoulder Press",
    "Overhead Press",
    "Machine Shoulder Press",
    "Smith Machine Overhead Press",
    "HS Shoulder Press",
    "Cable Shoulder Press",
  ],
  "Machine Shoulder Press": [
    "Dumbbell Shoulder Press",
    "Overhead Press",
    "Smith Machine Overhead Press",
    "HS Shoulder Press",
    "HS Iso-Lateral Shoulder Press",
    "HS Military Press",
    "Arnold Press",
    "Seated Barbell Press",
  ],
  "Smith Machine Overhead Press": [
    "Overhead Press",
    "Machine Shoulder Press",
    "Dumbbell Shoulder Press",
    "Seated Barbell Press",
    "HS Shoulder Press",
    "HS Military Press",
  ],
  "HS Shoulder Press": [
    "HS Iso-Lateral Shoulder Press",
    "HS Military Press",
    "Machine Shoulder Press",
    "Dumbbell Shoulder Press",
    "Overhead Press",
    "Smith Machine Overhead Press",
  ],
  "HS Iso-Lateral Shoulder Press": [
    "HS Shoulder Press",
    "HS Military Press",
    "Machine Shoulder Press",
    "Dumbbell Shoulder Press",
    "Overhead Press",
  ],
  "HS Military Press": [
    "HS Shoulder Press",
    "HS Iso-Lateral Shoulder Press",
    "Machine Shoulder Press",
    "Overhead Press",
    "Smith Machine Overhead Press",
  ],
  "Cable Shoulder Press": [
    "Dumbbell Shoulder Press",
    "Arnold Press",
    "Machine Shoulder Press",
    "Overhead Press",
  ],
  "Dumbbell Front Raise": [
    "Cable Front Raise",
    "Plate Front Raise",
    "Single-Arm Cable Front Raise",
    "Dumbbell Shoulder Press",
  ],
  "Cable Front Raise": [
    "Dumbbell Front Raise",
    "Single-Arm Cable Front Raise",
    "Plate Front Raise",
    "Cable Shoulder Press",
  ],
  "Plate Front Raise": [
    "Dumbbell Front Raise",
    "Cable Front Raise",
    "Single-Arm Cable Front Raise",
  ],
  "Single-Arm Cable Front Raise": [
    "Cable Front Raise",
    "Dumbbell Front Raise",
    "Plate Front Raise",
  ],

  // ════════════════════════════════════════════════════════════
  // BICEPS
  // ════════════════════════════════════════════════════════════

  // ── Standard curl ──
  "Barbell Curl": [
    "EZ-Bar Curl",
    "Dumbbell Curl",
    "Cable Curl",
    "Low Cable Curl (EZ-Bar)",
    "Machine Curl",
    "HS Bicep Curl",
    "Barbell Drag Curl",
  ],
  "EZ-Bar Curl": [
    "Barbell Curl",
    "Dumbbell Curl",
    "Cable Curl",
    "Low Cable Curl (EZ-Bar)",
    "Machine Curl",
    "HS Bicep Curl",
  ],
  "Dumbbell Curl": [
    "Barbell Curl",
    "EZ-Bar Curl",
    "Cable Curl",
    "Machine Curl",
    "Concentration Curl",
    "HS Bicep Curl",
  ],
  "Cable Curl": [
    "Barbell Curl",
    "EZ-Bar Curl",
    "Dumbbell Curl",
    "Low Cable Curl (EZ-Bar)",
    "Single-Arm Cable Curl",
    "High Cable Curl",
    "Machine Curl",
    "HS Bicep Curl",
  ],
  "Low Cable Curl (EZ-Bar)": [
    "Cable Curl",
    "EZ-Bar Curl",
    "Barbell Curl",
    "Machine Curl",
    "Dumbbell Curl",
  ],
  "Single-Arm Cable Curl": [
    "Cable Curl",
    "Concentration Curl",
    "Cable Concentration Curl",
    "Dumbbell Curl",
    "Bayesian Cable Curl",
  ],
  "High Cable Curl": [
    "Cable Curl",
    "Overhead Cable Curl",
    "Barbell Curl",
    "EZ-Bar Curl",
  ],
  "Overhead Cable Curl": [
    "High Cable Curl",
    "Cable Curl",
    "Barbell Curl",
  ],
  "Machine Curl": [
    "Cable Curl",
    "Barbell Curl",
    "EZ-Bar Curl",
    "HS Bicep Curl",
    "Dumbbell Curl",
  ],
  "HS Bicep Curl": [
    "Machine Curl",
    "Cable Curl",
    "Barbell Curl",
    "EZ-Bar Curl",
    "HS Preacher Curl",
  ],
  "Barbell Drag Curl": [
    "Barbell Curl",
    "EZ-Bar Curl",
    "Cable Curl",
    "Dumbbell Curl",
  ],

  // ── Incline / stretch ──
  "Incline Dumbbell Curl": [
    "Bayesian Cable Curl",
    "Dumbbell Curl",
    "Cable Curl",
    "Spider Curl",
    "Barbell Curl",
  ],
  "Bayesian Cable Curl": [
    "Incline Dumbbell Curl",
    "Cable Curl",
    "Dumbbell Curl",
    "Single-Arm Cable Curl",
  ],

  // ── Preacher / concentration ──
  "Preacher Curl": [
    "Dumbbell Preacher Curl",
    "Cable Preacher Curl",
    "HS Preacher Curl",
    "HS Iso-Lateral Preacher Curl",
    "Spider Curl",
    "Concentration Curl",
    "Machine Curl",
  ],
  "Dumbbell Preacher Curl": [
    "Preacher Curl",
    "Cable Preacher Curl",
    "HS Preacher Curl",
    "Concentration Curl",
    "Spider Curl",
  ],
  "Cable Preacher Curl": [
    "Preacher Curl",
    "Dumbbell Preacher Curl",
    "HS Preacher Curl",
    "Cable Concentration Curl",
    "Cable Curl",
  ],
  "HS Preacher Curl": [
    "HS Iso-Lateral Preacher Curl",
    "Preacher Curl",
    "Machine Curl",
    "Dumbbell Preacher Curl",
    "Cable Preacher Curl",
  ],
  "HS Iso-Lateral Preacher Curl": [
    "HS Preacher Curl",
    "Preacher Curl",
    "Machine Curl",
    "Dumbbell Preacher Curl",
  ],
  "Concentration Curl": [
    "Cable Concentration Curl",
    "Dumbbell Preacher Curl",
    "Preacher Curl",
    "Spider Curl",
    "Single-Arm Cable Curl",
  ],
  "Cable Concentration Curl": [
    "Concentration Curl",
    "Single-Arm Cable Curl",
    "Cable Preacher Curl",
    "Bayesian Cable Curl",
  ],
  "Spider Curl": [
    "Preacher Curl",
    "Concentration Curl",
    "Dumbbell Preacher Curl",
    "Cable Preacher Curl",
    "Incline Dumbbell Curl",
  ],

  // ── Hammer / brachialis ──
  "Hammer Curl": [
    "Cable Hammer Curl (Rope)",
    "Zottman Curl",
    "Dumbbell Curl",
    "Reverse Barbell Curl",
    "Reverse Cable Curl",
  ],
  "Cable Hammer Curl (Rope)": [
    "Hammer Curl",
    "Zottman Curl",
    "Cable Curl",
    "Reverse Cable Curl",
    "Reverse Barbell Curl",
  ],
  "Zottman Curl": [
    "Hammer Curl",
    "Cable Hammer Curl (Rope)",
    "Dumbbell Curl",
    "Reverse Barbell Curl",
  ],

  // ════════════════════════════════════════════════════════════
  // TRICEPS
  // ════════════════════════════════════════════════════════════

  // ── Pushdown ──
  "Triceps Pushdown": [
    "Triceps Rope Pushdown",
    "Cable V-Bar Pushdown",
    "Reverse-Grip Cable Pushdown",
    "Single-Arm Cable Pushdown",
    "Cable Cross-Body Pushdown",
    "Machine Dip",
    "HS Tricep Extension",
  ],
  "Triceps Rope Pushdown": [
    "Triceps Pushdown",
    "Cable V-Bar Pushdown",
    "Single-Arm Cable Pushdown",
    "Reverse-Grip Cable Pushdown",
    "Cable Cross-Body Pushdown",
    "Machine Dip",
  ],
  "Cable V-Bar Pushdown": [
    "Triceps Pushdown",
    "Triceps Rope Pushdown",
    "Single-Arm Cable Pushdown",
    "Reverse-Grip Cable Pushdown",
    "HS Tricep Extension",
  ],
  "Single-Arm Cable Pushdown": [
    "Triceps Pushdown",
    "Triceps Rope Pushdown",
    "Reverse-Grip Cable Pushdown",
    "Cable Cross-Body Pushdown",
    "HS Iso-Lateral Tricep Extension",
  ],
  "Reverse-Grip Cable Pushdown": [
    "Triceps Pushdown",
    "Triceps Rope Pushdown",
    "Single-Arm Cable Pushdown",
    "Cable V-Bar Pushdown",
  ],
  "Cable Cross-Body Pushdown": [
    "Single-Arm Cable Pushdown",
    "Triceps Pushdown",
    "Triceps Rope Pushdown",
    "Reverse-Grip Cable Pushdown",
  ],
  "Machine Dip": [
    "Dip",
    "Triceps Pushdown",
    "Triceps Rope Pushdown",
    "HS Dip",
    "Close-Grip Bench Press",
  ],

  // ── Overhead extension ──
  "Overhead Cable Triceps Extension": [
    "Overhead Dumbbell Triceps Extension",
    "Single-Arm Overhead Cable Extension",
    "EZ-Bar Skull Crusher",
    "Dumbbell Skull Crusher",
    "Cable Skull Crusher",
    "Triceps Rope Pushdown",
  ],
  "Overhead Dumbbell Triceps Extension": [
    "Overhead Cable Triceps Extension",
    "Single-Arm Overhead Cable Extension",
    "EZ-Bar Skull Crusher",
    "Dumbbell Skull Crusher",
    "Cable Skull Crusher",
  ],
  "Single-Arm Overhead Cable Extension": [
    "Overhead Cable Triceps Extension",
    "Overhead Dumbbell Triceps Extension",
    "Cable Skull Crusher",
    "HS Iso-Lateral Tricep Extension",
  ],

  // ── Skull crusher ──
  "EZ-Bar Skull Crusher": [
    "Dumbbell Skull Crusher",
    "Cable Skull Crusher",
    "Overhead Cable Triceps Extension",
    "Overhead Dumbbell Triceps Extension",
    "JM Press",
  ],
  "Dumbbell Skull Crusher": [
    "EZ-Bar Skull Crusher",
    "Cable Skull Crusher",
    "Overhead Dumbbell Triceps Extension",
    "Overhead Cable Triceps Extension",
  ],
  "Cable Skull Crusher": [
    "EZ-Bar Skull Crusher",
    "Dumbbell Skull Crusher",
    "Overhead Cable Triceps Extension",
    "Single-Arm Overhead Cable Extension",
  ],

  // ── Compound triceps ──
  "Close-Grip Bench Press": [
    "JM Press",
    "Dip",
    "Machine Dip",
    "HS Dip",
    "EZ-Bar Skull Crusher",
    "Diamond Push-Up",
  ],
  "Dip": [
    "Machine Dip",
    "Close-Grip Bench Press",
    "HS Dip",
    "Diamond Push-Up",
    "Triceps Pushdown",
  ],
  "Diamond Push-Up": [
    "Dip",
    "Close-Grip Bench Press",
    "Machine Dip",
    "Triceps Pushdown",
    "Push-Up",
  ],
  "JM Press": [
    "Close-Grip Bench Press",
    "EZ-Bar Skull Crusher",
    "Dip",
    "Machine Dip",
  ],
  "Kickback": [
    "Cable Kickback",
    "Single-Arm Cable Pushdown",
    "Triceps Rope Pushdown",
    "Triceps Pushdown",
  ],
  "Cable Kickback": [
    "Kickback",
    "Single-Arm Cable Pushdown",
    "Triceps Rope Pushdown",
    "Triceps Pushdown",
  ],

  // ── HS Triceps ──
  "HS Tricep Extension": [
    "HS Iso-Lateral Tricep Extension",
    "Machine Dip",
    "Triceps Pushdown",
    "Cable V-Bar Pushdown",
    "Triceps Rope Pushdown",
  ],
  "HS Iso-Lateral Tricep Extension": [
    "HS Tricep Extension",
    "Single-Arm Cable Pushdown",
    "Single-Arm Overhead Cable Extension",
    "Machine Dip",
  ],
  "HS Dip": [
    "Machine Dip",
    "Dip",
    "Close-Grip Bench Press",
    "HS Tricep Extension",
    "Triceps Pushdown",
  ],

  // ════════════════════════════════════════════════════════════
  // CALVES
  // ════════════════════════════════════════════════════════════

  "Standing Calf Raise": [
    "Smith Machine Calf Raise",
    "Barbell Calf Raise",
    "HS Standing Calf Raise",
    "Dumbbell Calf Raise",
    "Leg Press Calf Raise",
    "Donkey Calf Raise",
    "Cable Calf Raise",
    "Single-Leg Calf Raise",
  ],
  "Seated Calf Raise": [
    "HS Seated Calf Raise",
    "Leg Press Calf Raise",
    "Dumbbell Calf Raise",
    "Cable Calf Raise",
    "Smith Machine Calf Raise",
  ],
  "Leg Press Calf Raise": [
    "Standing Calf Raise",
    "Seated Calf Raise",
    "Smith Machine Calf Raise",
    "HS Standing Calf Raise",
    "Donkey Calf Raise",
  ],
  "Smith Machine Calf Raise": [
    "Standing Calf Raise",
    "Barbell Calf Raise",
    "HS Standing Calf Raise",
    "Leg Press Calf Raise",
    "Dumbbell Calf Raise",
  ],
  "Dumbbell Calf Raise": [
    "Single-Leg Calf Raise",
    "Standing Calf Raise",
    "Cable Calf Raise",
    "Smith Machine Calf Raise",
    "Barbell Calf Raise",
  ],
  "Barbell Calf Raise": [
    "Standing Calf Raise",
    "Smith Machine Calf Raise",
    "HS Standing Calf Raise",
    "Dumbbell Calf Raise",
    "Leg Press Calf Raise",
  ],
  "Donkey Calf Raise": [
    "Standing Calf Raise",
    "Leg Press Calf Raise",
    "Smith Machine Calf Raise",
    "HS Standing Calf Raise",
  ],
  "Single-Leg Calf Raise": [
    "Dumbbell Calf Raise",
    "Standing Calf Raise",
    "Cable Calf Raise",
    "Smith Machine Calf Raise",
  ],
  "Cable Calf Raise": [
    "Dumbbell Calf Raise",
    "Single-Leg Calf Raise",
    "Standing Calf Raise",
    "Seated Calf Raise",
  ],
  "Tibialis Raise": [],
  "HS Standing Calf Raise": [
    "Standing Calf Raise",
    "Smith Machine Calf Raise",
    "Barbell Calf Raise",
    "Leg Press Calf Raise",
    "Donkey Calf Raise",
  ],
  "HS Seated Calf Raise": [
    "Seated Calf Raise",
    "Leg Press Calf Raise",
    "Cable Calf Raise",
    "Dumbbell Calf Raise",
  ],

  // ════════════════════════════════════════════════════════════
  // FOREARMS
  // ════════════════════════════════════════════════════════════

  "Wrist Curl": [
    "Dumbbell Wrist Curl",
    "Cable Wrist Curl",
    "Behind-the-Back Wrist Curl",
  ],
  "Dumbbell Wrist Curl": [
    "Wrist Curl",
    "Cable Wrist Curl",
    "Behind-the-Back Wrist Curl",
  ],
  "Cable Wrist Curl": [
    "Wrist Curl",
    "Dumbbell Wrist Curl",
    "Behind-the-Back Wrist Curl",
  ],
  "Behind-the-Back Wrist Curl": [
    "Wrist Curl",
    "Dumbbell Wrist Curl",
    "Cable Wrist Curl",
  ],
  "Reverse Wrist Curl": [
    "Reverse Barbell Curl",
    "Reverse Cable Curl",
    "Cable Reverse Wrist Curl",
    "Zottman Curl",
  ],
  "Cable Reverse Wrist Curl": [
    "Reverse Wrist Curl",
    "Reverse Cable Curl",
    "Reverse Barbell Curl",
  ],
  "Reverse Barbell Curl": [
    "Reverse Cable Curl",
    "Reverse Wrist Curl",
    "Zottman Curl",
    "Hammer Curl",
    "Cable Hammer Curl (Rope)",
  ],
  "Reverse Cable Curl": [
    "Reverse Barbell Curl",
    "Reverse Wrist Curl",
    "Zottman Curl",
    "Hammer Curl",
  ],
  "Farmer's Walk": [
    "Dead Hang",
    "Plate Pinch Hold",
    "Dumbbell Shrug",
    "Trap Bar Shrug",
  ],
  "Dead Hang": [
    "Farmer's Walk",
    "Plate Pinch Hold",
    "Pull-Up",
  ],
  "Plate Pinch Hold": [
    "Farmer's Walk",
    "Dead Hang",
    "Dumbbell Wrist Curl",
  ],

  // ════════════════════════════════════════════════════════════
  // TRAPS
  // ════════════════════════════════════════════════════════════

  "Barbell Shrug": [
    "Dumbbell Shrug",
    "Smith Machine Shrug",
    "Cable Shrug",
    "Trap Bar Shrug",
    "Machine Shrug",
    "HS Shrug",
    "Kettlebell Shrug",
    "Behind-the-Back Barbell Shrug",
    "Behind-the-Back Cable Shrug",
    "Single-Arm Cable Shrug",
    "Overhead Shrug",
  ],
  "Dumbbell Shrug": [
    "Barbell Shrug",
    "Cable Shrug",
    "Smith Machine Shrug",
    "Trap Bar Shrug",
    "Machine Shrug",
    "HS Shrug",
    "Kettlebell Shrug",
    "Single-Arm Cable Shrug",
  ],
  "Smith Machine Shrug": [
    "Barbell Shrug",
    "Dumbbell Shrug",
    "Machine Shrug",
    "HS Shrug",
    "Trap Bar Shrug",
    "Cable Shrug",
    "Behind-the-Back Barbell Shrug",
  ],
  "Cable Shrug": [
    "Dumbbell Shrug",
    "Barbell Shrug",
    "Behind-the-Back Cable Shrug",
    "Single-Arm Cable Shrug",
    "Machine Shrug",
    "Smith Machine Shrug",
  ],
  "Trap Bar Shrug": [
    "Barbell Shrug",
    "Dumbbell Shrug",
    "Smith Machine Shrug",
    "Machine Shrug",
    "HS Shrug",
  ],
  "Machine Shrug": [
    "HS Shrug",
    "Smith Machine Shrug",
    "Barbell Shrug",
    "Dumbbell Shrug",
    "Cable Shrug",
  ],
  "HS Shrug": [
    "Machine Shrug",
    "Smith Machine Shrug",
    "Barbell Shrug",
    "Dumbbell Shrug",
    "Trap Bar Shrug",
  ],
  "Kettlebell Shrug": [
    "Dumbbell Shrug",
    "Cable Shrug",
    "Barbell Shrug",
    "Single-Arm Cable Shrug",
  ],
  "Behind-the-Back Barbell Shrug": [
    "Barbell Shrug",
    "Smith Machine Shrug",
    "Behind-the-Back Cable Shrug",
    "Dumbbell Shrug",
  ],
  "Behind-the-Back Cable Shrug": [
    "Behind-the-Back Barbell Shrug",
    "Cable Shrug",
    "Barbell Shrug",
    "Single-Arm Cable Shrug",
  ],
  "Single-Arm Cable Shrug": [
    "Cable Shrug",
    "Dumbbell Shrug",
    "Behind-the-Back Cable Shrug",
    "Kettlebell Shrug",
  ],
  "Overhead Shrug": [
    "Barbell Shrug",
    "Smith Machine Shrug",
    "Dumbbell Shrug",
    "HS Shrug",
  ],
  "Rack Pull": [
    "Barbell Shrug",
    "Trap Bar Shrug",
    "Smith Machine Shrug",
    "Sumo Deadlift",
  ],

  // ════════════════════════════════════════════════════════════
  // ABS
  // ════════════════════════════════════════════════════════════

  "Cable Crunch": [
    "Kneeling Cable Crunch",
    "Standing Cable Crunch",
    "Machine Crunch",
    "HS Crunch",
    "Decline Sit-Up",
    "Ab Wheel Rollout",
    "Hanging Knee Raise",
    "Cable Reverse Crunch",
  ],
  "Kneeling Cable Crunch": [
    "Cable Crunch",
    "Standing Cable Crunch",
    "Machine Crunch",
    "HS Crunch",
    "Decline Sit-Up",
  ],
  "Standing Cable Crunch": [
    "Cable Crunch",
    "Kneeling Cable Crunch",
    "Machine Crunch",
    "Decline Sit-Up",
    "HS Crunch",
  ],
  "Machine Crunch": [
    "Cable Crunch",
    "HS Crunch",
    "Kneeling Cable Crunch",
    "Decline Sit-Up",
    "Standing Cable Crunch",
  ],
  "HS Crunch": [
    "Machine Crunch",
    "Cable Crunch",
    "Kneeling Cable Crunch",
    "Decline Sit-Up",
  ],
  "Hanging Leg Raise": [
    "Hanging Knee Raise",
    "Captain's Chair Leg Raise",
    "Cable Reverse Crunch",
    "V-Up",
    "Dragon Flag",
    "Ab Wheel Rollout",
    "Cable Crunch",
  ],
  "Hanging Knee Raise": [
    "Hanging Leg Raise",
    "Captain's Chair Leg Raise",
    "Cable Reverse Crunch",
    "V-Up",
    "Cable Crunch",
  ],
  "Captain's Chair Leg Raise": [
    "Hanging Leg Raise",
    "Hanging Knee Raise",
    "Cable Reverse Crunch",
    "V-Up",
  ],
  "Cable Reverse Crunch": [
    "Hanging Knee Raise",
    "Hanging Leg Raise",
    "Captain's Chair Leg Raise",
    "V-Up",
  ],
  "Ab Wheel Rollout": [
    "Dragon Flag",
    "Hanging Leg Raise",
    "Cable Crunch",
    "Weighted Plank",
    "Pallof Press",
  ],
  "Decline Sit-Up": [
    "Machine Crunch",
    "Cable Crunch",
    "HS Crunch",
    "Kneeling Cable Crunch",
    "V-Up",
  ],
  "Weighted Plank": [
    "Ab Wheel Rollout",
    "Pallof Press",
    "Dragon Flag",
    "Cable Crunch",
  ],
  "Pallof Press": [
    "Woodchop",
    "Cable Oblique Twist",
    "Weighted Plank",
    "Low-to-High Cable Chop",
    "High-to-Low Cable Chop",
    "Cable Side Bend",
  ],
  "Bicycle Crunch": [
    "V-Up",
    "Cable Oblique Twist",
    "Decline Sit-Up",
    "Cable Crunch",
    "Hanging Knee Raise",
  ],
  "V-Up": [
    "Hanging Leg Raise",
    "Captain's Chair Leg Raise",
    "Bicycle Crunch",
    "Decline Sit-Up",
    "Cable Reverse Crunch",
  ],
  "Woodchop": [
    "Cable Oblique Twist",
    "Low-to-High Cable Chop",
    "High-to-Low Cable Chop",
    "Pallof Press",
    "Cable Side Bend",
  ],
  "Dragon Flag": [
    "Ab Wheel Rollout",
    "Hanging Leg Raise",
    "Weighted Plank",
    "Captain's Chair Leg Raise",
  ],
  "Cable Side Bend": [
    "Cable Oblique Twist",
    "Woodchop",
    "Pallof Press",
    "Low-to-High Cable Chop",
  ],
  "Cable Oblique Twist": [
    "Woodchop",
    "Pallof Press",
    "Cable Side Bend",
    "Low-to-High Cable Chop",
    "High-to-Low Cable Chop",
  ],
  "Low-to-High Cable Chop": [
    "Woodchop",
    "High-to-Low Cable Chop",
    "Cable Oblique Twist",
    "Pallof Press",
  ],
  "High-to-Low Cable Chop": [
    "Woodchop",
    "Low-to-High Cable Chop",
    "Cable Oblique Twist",
    "Pallof Press",
  ],

  // ════════════════════════════════════════════════════════════
  // NECK
  // ════════════════════════════════════════════════════════════

  "Neck Curl (Plate)": [
    "Band Neck Flexion",
    "Neck Extension (Plate)",
  ],
  "Neck Extension (Plate)": [
    "Neck Harness Extension",
    "Band Neck Extension",
    "Neck Curl (Plate)",
  ],
  "Neck Harness Extension": [
    "Neck Extension (Plate)",
    "Band Neck Extension",
  ],
  "Band Neck Flexion": [
    "Neck Curl (Plate)",
    "Band Neck Extension",
  ],
  "Band Neck Extension": [
    "Neck Harness Extension",
    "Neck Extension (Plate)",
    "Band Neck Flexion",
  ],

  // ════════════════════════════════════════════════════════════
  // ADDUCTORS
  // ════════════════════════════════════════════════════════════

  "Machine Hip Adduction": [
    "Cable Hip Adduction",
    "Band Hip Adduction",
    "Copenhagen Plank",
    "Wide-Stance Leg Press",
    "Sumo Squat",
    "Side-Lying Adduction",
  ],
  "Cable Hip Adduction": [
    "Machine Hip Adduction",
    "Band Hip Adduction",
    "Copenhagen Plank",
    "Side-Lying Adduction",
  ],
  "Band Hip Adduction": [
    "Machine Hip Adduction",
    "Cable Hip Adduction",
    "Side-Lying Adduction",
    "Copenhagen Plank",
  ],
  "Copenhagen Plank": [
    "Machine Hip Adduction",
    "Cable Hip Adduction",
    "Side-Lying Adduction",
    "Band Hip Adduction",
  ],
  "Sumo Squat": [
    "Wide-Stance Leg Press",
    "Machine Hip Adduction",
    "Goblet Squat",
    "Cable Hip Adduction",
  ],
  "Side-Lying Adduction": [
    "Machine Hip Adduction",
    "Cable Hip Adduction",
    "Band Hip Adduction",
    "Copenhagen Plank",
  ],

  // ════════════════════════════════════════════════════════════
  // ABDUCTORS
  // ════════════════════════════════════════════════════════════

  "Machine Hip Abduction": [
    "Cable Hip Abduction",
    "Banded Side Walk",
    "Band Clamshell",
    "Banded Squat Walk",
    "Side-Lying Hip Abduction",
    "Fire Hydrant",
  ],
  "Cable Hip Abduction": [
    "Machine Hip Abduction",
    "Banded Side Walk",
    "Band Clamshell",
    "Side-Lying Hip Abduction",
    "Fire Hydrant",
  ],
  "Band Clamshell": [
    "Machine Hip Abduction",
    "Cable Hip Abduction",
    "Side-Lying Hip Abduction",
    "Fire Hydrant",
    "Banded Side Walk",
  ],
  "Banded Side Walk": [
    "Banded Squat Walk",
    "Machine Hip Abduction",
    "Cable Hip Abduction",
    "Band Clamshell",
    "Fire Hydrant",
  ],
  "Side-Lying Hip Abduction": [
    "Band Clamshell",
    "Machine Hip Abduction",
    "Cable Hip Abduction",
    "Fire Hydrant",
  ],
  "Fire Hydrant": [
    "Band Clamshell",
    "Side-Lying Hip Abduction",
    "Machine Hip Abduction",
    "Cable Hip Abduction",
    "Banded Side Walk",
  ],
  "Banded Squat Walk": [
    "Banded Side Walk",
    "Machine Hip Abduction",
    "Cable Hip Abduction",
    "Band Clamshell",
  ],
};


export const EQUIPMENT_TYPES = [
  "barbell", "dumbbell", "machine", "cable", "bodyweight",
  "smith machine", "hammer strength", "band", "kettlebell",
];

export const CARDIO_TYPES = [
  "Running", "Cycling", "Swimming", "Rowing", "Elliptical",
  "Stair Climber", "Walking", "HIIT", "Jump Rope", "Hiking",
];

// Generate weekly set-count progression from MEV to MRV across `weeks`
// accumulation weeks, ending in a deload at ~50% of week-1 sets.
export function progressSets(MEV, MRV, weeks) {
  if (weeks < 2) return [MEV];
  const accumWeeks = weeks - 1; // last week is the deload
  const span = MRV - MEV;
  const out = [];
  for (let i = 0; i < accumWeeks; i++) {
    const frac = i / Math.max(1, accumWeeks - 1);
    out.push(Math.round(MEV + span * frac));
  }
  // Deload week: ~50% of MEV sets, minimum 2.
  out.push(Math.max(2, Math.round(MEV * 0.5)));
  return out;
}

// Reps-in-reserve progression: starts at ~3 RIR, drives toward 0 on the
// last accumulation week, then deload at 4 RIR.
export function progressRIR(weeks) {
  if (weeks < 2) return [3];
  const accum = weeks - 1;
  const out = [];
  for (let i = 0; i < accum; i++) {
    const frac = i / Math.max(1, accum - 1);
    out.push(Math.max(0, Math.round(3 - 3 * frac)));
  }
  out.push(4); // deload
  return out;
}

// Given a set count for a muscle group in a week and a list of exercises
// targeting that group, distribute the sets as evenly as possible across
// the exercises. Returns sets-per-exercise as an array (same order).
export function distributeSets(totalSets, exerciseCount) {
  if (exerciseCount <= 0) return [];
  const base = Math.floor(totalSets / exerciseCount);
  const extra = totalSets - base * exerciseCount;
  return Array.from({ length: exerciseCount }, (_, i) =>
    base + (i < extra ? 1 : 0),
  );
}

// Estimated 1RM (Epley). Used for tiny progression suggestions only.
export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

export function suggestWeight(prev, targetReps, targetRIR, exerciseName) {
  if (!prev) return null;
  const { weight, reps, rir } = prev;
  if (!weight) return null;

  const p = getProfile(exerciseName);

  if (p.progression === 0) return null;

  if (reps < targetReps) return Math.round(weight * 10) / 10;

  const buffer = rir - targetRIR;
  let factor;

  if (buffer >= 2) {
    factor = 1 + p.progression * 2;
  } else if (buffer >= 1) {
    factor = 1 + p.progression * 1.5;
  } else if (buffer >= 0) {
    factor = 1 + p.progression;
  } else {
    factor = 1.0;
  }

  const raw = weight * factor;

  if (p.type === "compound" && p.tier === "heavy") {
    return Math.round(raw / 2.5) * 2.5;
  }
  return Math.round(raw * 2) / 2;
}

// Flatten every program-template day into a reusable "workout module" that
// targets a particular set of muscle groups. Identical day layouts (same
// exercises) collapse into one module. `groups` maps muscle group -> number of
// exercises (a proxy for working sets) so suggestions can match modules to the
// muscles a lifter wants to bring up.
export function getWorkoutModules() {
  const bySignature = new Map();
  PROGRAM_TEMPLATES.forEach((tpl) => {
    (tpl.days || []).forEach((day, di) => {
      const exercises = (day.exercises || []).map((e) => ({
        exercise: e.exercise,
        muscleGroup: e.muscleGroup,
      }));
      if (!exercises.length) return;
      const signature = exercises.map((e) => e.exercise).sort().join("|");
      if (bySignature.has(signature)) return;
      const groups = {};
      for (const e of exercises) {
        if (!e.muscleGroup) continue;
        groups[e.muscleGroup] = (groups[e.muscleGroup] || 0) + 1;
      }
      bySignature.set(signature, {
        id: `${tpl.name}::${di}`,
        label: `${day.name} · ${tpl.name}`,
        dayName: day.name,
        templateName: tpl.name,
        exercises,
        groups,
      });
    });
  });
  return [...bySignature.values()];
}
