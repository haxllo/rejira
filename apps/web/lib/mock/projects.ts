import type { Project, Cycle, Label } from "./types";

export const PROJECTS: Project[] = [
  {
    id: "p_eng",
    key: "ENG",
    name: "Engineering",
    description: "Core platform, infrastructure, and developer experience.",
    iconLetter: "E",
    iconColor: "oklch(0.78 0.16 200)",
    lead: "u_aria",
    members: ["u_aria", "u_kenji", "u_maya", "u_dev", "u_lior", "u_omar", "u_sven"],
    cycles: ["c_23", "c_24"],
  },
  {
    id: "p_design",
    key: "DSG",
    name: "Design System",
    description: "Tokens, primitives, motion, and accessibility across all surfaces.",
    iconLetter: "D",
    iconColor: "oklch(0.78 0.16 310)",
    lead: "u_maya",
    members: ["u_aria", "u_maya", "u_jess", "u_rafa"],
    cycles: ["c_18"],
  },
  {
    id: "p_growth",
    key: "GRW",
    name: "Growth",
    description: "Acquisition, activation, and lifecycle experiments.",
    iconLetter: "G",
    iconColor: "oklch(0.78 0.16 150)",
    lead: "u_priya",
    members: ["u_aria", "u_priya", "u_rafa", "u_hana"],
    cycles: [],
  },
  {
    id: "p_ops",
    key: "OPS",
    name: "Operations",
    description: "Internal tooling, finance, and customer ops.",
    iconLetter: "O",
    iconColor: "oklch(0.78 0.15 60)",
    lead: "u_jess",
    members: ["u_jess", "u_hana", "u_nia"],
    cycles: [],
  },
];

export const CYCLES: Cycle[] = [
  {
    id: "c_23",
    number: 23,
    projectId: "p_eng",
    name: "Cycle 23 — Realtime foundations",
    startDate: "2026-05-19",
    endDate: "2026-06-01",
    status: "active",
    goal: "Ship optimistic UI, presence, and command palette. Velocity target: 42 pts.",
  },
  {
    id: "c_24",
    number: 24,
    projectId: "p_eng",
    name: "Cycle 24 — Search & AI",
    startDate: "2026-06-02",
    endDate: "2026-06-15",
    status: "upcoming",
    goal: "Full-text + semantic search. AI triage and summarize. Cycle target: 38 pts.",
  },
  {
    id: "c_18",
    number: 18,
    projectId: "p_design",
    name: "Cycle 18 — Motion system",
    startDate: "2026-05-26",
    endDate: "2026-06-08",
    status: "active",
    goal: "Define and ship the motion token system; animate-ui integration.",
  },
];

export const LABELS: Label[] = [
  { id: "l_bug", name: "Bug", projectId: "p_eng" },
  { id: "l_feature", name: "Feature", projectId: "p_eng" },
  { id: "l_chore", name: "Chore", projectId: "p_eng" },
  { id: "l_regression", name: "Regression", projectId: "p_eng" },
  { id: "l_perf", name: "Performance", projectId: "p_eng" },
  { id: "l_design", name: "Design", projectId: "p_design" },
  { id: "l_figma", name: "Figma", projectId: "p_design" },
  { id: "l_motion", name: "Motion", projectId: "p_design" },
  { id: "l_experiment", name: "Experiment", projectId: "p_growth" },
  { id: "l_metrics", name: "Metrics", projectId: "p_growth" },
];

export function projectByKey(key: string) {
  return PROJECTS.find((p) => p.key.toLowerCase() === key.toLowerCase());
}
export function projectById(id: string) {
  return PROJECTS.find((p) => p.id === id);
}
export function cycleById(id: string) {
  return CYCLES.find((c) => c.id === id);
}
export function labelsForProject(projectId: string) {
  return LABELS.filter((l) => l.projectId === projectId);
}
export function labelById(id: string) {
  return LABELS.find((l) => l.id === id);
}
