export * from "./types";
export * from "./users";
export * from "./projects";
export * from "./issues";
export * from "./inbox";

import { ISSUES } from "./issues";
import { INBOX } from "./inbox";
import { CYCLES, PROJECTS, LABELS } from "./projects";
import { USERS } from "./users";

export const ALL = { ISSUES, INBOX, CYCLES, PROJECTS, LABELS, USERS };
