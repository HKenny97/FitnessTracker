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
  Glutes: { MV: 0, MEV: 0, MAV_lo: 4, MAV_hi: 12, MRV: 16 },
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
  // ── Chest (15) ─────────────────────────────────────────────
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

  // ── Back (15+) ──────────────────────────────────────────────
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

  // ── Quads (15+) ─────────────────────────────────────────────
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

  // ── Hamstrings (12) ────────────────────────────────────────
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

  // ── Glutes (12) ────────────────────────────────────────────
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

  // ── Shoulders (side delts) (12) ────────────────────────────
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

  // ── Shoulders (rear delts) (10) ────────────────────────────
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

  // ── Shoulders (front delts) (10) ───────────────────────────
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

  // ── Biceps (14) ────────────────────────────────────────────
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

  // ── Triceps (14) ───────────────────────────────────────────
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

  // ── Calves (8) ─────────────────────────────────────────────
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

  // ── Forearms (8+) ───────────────────────────────────────────
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

  // ── Traps (8+) ──────────────────────────────────────────────
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

  // ── Abs (10+) ───────────────────────────────────────────────
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

// Suggest the next session's working weight based on the previous session's
// top set and its RIR. Generic 1-RIR-buffer-to-target step.
//   - If you hit prescribed reps with > target RIR: bump weight ~2.5%.
//   - At target RIR: small bump ~1.5%.
//   - Below target RIR (too easy slipped): bigger jump ~3%.
//   - Missed reps (RIR < 0 effectively): hold or drop.
export function suggestWeight(prev, targetReps, targetRIR) {
  if (!prev) return null;
  const { weight, reps, rir } = prev;
  if (!weight) return null;
  if (reps < targetReps) return Math.round(weight * 10) / 10; // hold
  const buffer = rir - targetRIR;
  let factor = 1.015;
  if (buffer >= 2) factor = 1.03;
  else if (buffer >= 1) factor = 1.02;
  else if (buffer < 0) factor = 1.0;
  return Math.round(weight * factor * 10) / 10;
}
