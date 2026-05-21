import { equipmentLibrary } from "./equipmentLibrary";

export const mockUser = {
  name: "Ava Turner",
  initials: "AT",
  frequency: 4,
  goal: "Build strength",
  experience: "Intermediate",
  lastGenerated: "2 days ago", // This is a mock value, not used in logic
  duration: 60,
};

// Dynamically create equipmentCategories from equipmentLibrary
export const equipmentCategories = equipmentLibrary.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push({ id: item.id, name: item.name }); // Store both id and name
  return acc;
}, {});

export const weeklyPlan = [
  {
    day: "Monday",
    type: "Upper body strength",
    rest: false,
    exercises: [
      { name: "Barbell bench press", sets: 4, reps: "8-10", rest: "90s" },
      { name: "Pull-ups", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Dumbbell shoulder press", sets: 3, reps: "10-12", rest: "75s" },
      { name: "Cable rows", sets: 3, reps: "10-12", rest: "75s" },
    ],
  },
  {
    day: "Tuesday",
    type: "Lower body power",
    rest: false,
    exercises: [
      { name: "Back squat", sets: 4, reps: "6-8", rest: "120s" },
      { name: "Romanian deadlift", sets: 3, reps: "8-10", rest: "90s" },
      { name: "Walking lunges", sets: 3, reps: "12 per leg", rest: "75s" },
      { name: "Leg press", sets: 3, reps: "10-12", rest: "90s" },
    ],
  },
  {
    day: "Wednesday",
    type: "Recovery",
    rest: true,
    exercises: [{ name: "Mobility flow", sets: 1, reps: "20 min", rest: "—" }],
  },
  {
    day: "Thursday",
    type: "Push focus",
    rest: false,
    exercises: [
      { name: "Incline dumbbell press", sets: 4, reps: "8-10", rest: "90s" },
      { name: "Overhead press", sets: 3, reps: "8-10", rest: "90s" },
      { name: "Triceps dips", sets: 3, reps: "10-12", rest: "75s" },
    ],
  },
  {
    day: "Friday",
    type: "Pull focus",
    rest: false,
    exercises: [
      { name: "Bent-over row", sets: 4, reps: "8-10", rest: "90s" },
      { name: "Face pulls", sets: 3, reps: "12-15", rest: "60s" },
      { name: "Hammer curls", sets: 3, reps: "10-12", rest: "75s" },
    ],
  },
  {
    day: "Saturday",
    type: "Cardio conditioning",
    rest: false,
    exercises: [
      {
        name: "Interval run",
        sets: 6,
        reps: "1 min on / 1 min off",
        rest: "—",
      },
      { name: "Kettlebell swings", sets: 3, reps: "15", rest: "60s" },
    ],
  },
  {
    day: "Sunday",
    type: "Active recovery",
    rest: true,
    exercises: [
      { name: "Stretch routine", sets: 1, reps: "20 min", rest: "—" },
    ],
  },
];

export const planHistory = [
  {
    id: "plan-001",
    goal: "Build strength",
    date: "Apr 14, 2026",
    summary: "Full-body strength routine with four weekly workouts.",
  },
  {
    id: "plan-002",
    goal: "Lean muscle",
    date: "Mar 31, 2026",
    summary: "Targeted muscle-building split with extra recovery support.",
  },
  {
    id: "plan-003",
    goal: "Endurance",
    date: "Mar 10, 2026",
    summary: "Energy-friendly circuit-style weeks for better conditioning.",
  },
];
