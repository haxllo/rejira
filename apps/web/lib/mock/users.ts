import type { User } from "./types";
import { ME_EXTERNAL_ID } from "../auth/demo-session";

// TODO Phase 3: delete this re-export. The constant will live in
// `useSession().userId` (Better Auth) and won't be hard-coded anymore.
export const ME_ID = ME_EXTERNAL_ID;

export const USERS: User[] = [
  { id: "u_aria", name: "Aria Vance", email: "aria@acme.dev", role: "admin", status: "online", avatarColor: "oklch(0.72 0.18 25)" },
  { id: "u_kenji", name: "Kenji Sato", email: "kenji@acme.dev", role: "member", status: "online", avatarColor: "oklch(0.78 0.15 60)" },
  { id: "u_maya", name: "Maya Iyer", email: "maya@acme.dev", role: "member", status: "online", avatarColor: "oklch(0.80 0.16 100)" },
  { id: "u_dev", name: "Devon Park", email: "devon@acme.dev", role: "member", status: "away", avatarColor: "oklch(0.78 0.16 150)" },
  { id: "u_lior", name: "Lior Mizrahi", email: "lior@acme.dev", role: "member", status: "online", avatarColor: "oklch(0.78 0.14 200)" },
  { id: "u_priya", name: "Priya Anand", email: "priya@acme.dev", role: "member", status: "offline", avatarColor: "oklch(0.72 0.15 260)" },
  { id: "u_omar", name: "Omar Rashid", email: "omar@acme.dev", role: "member", status: "online", avatarColor: "oklch(0.70 0.16 310)" },
  { id: "u_jess", name: "Jess Holm", email: "jess@acme.dev", role: "member", status: "away", avatarColor: "oklch(0.72 0.16 350)" },
  { id: "u_rafa", name: "Rafael Núñez", email: "rafa@acme.dev", role: "member", status: "online", avatarColor: "oklch(0.78 0.14 30)" },
  { id: "u_hana", name: "Hana Choi", email: "hana@acme.dev", role: "member", status: "offline", avatarColor: "oklch(0.80 0.10 180)" },
  { id: "u_sven", name: "Sven Larsson", email: "sven@acme.dev", role: "member", status: "online", avatarColor: "oklch(0.72 0.12 220)" },
  { id: "u_nia", name: "Nia Okonkwo", email: "nia@acme.dev", role: "guest", status: "online", avatarColor: "oklch(0.78 0.16 80)" },
];

export function userById(id: string) {
  return USERS.find((u) => u.id === id);
}

export function usersByIds(ids: string[]) {
  return ids.map(userById).filter(Boolean) as User[];
}
