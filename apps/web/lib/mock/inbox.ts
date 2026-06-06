import type { InboxItem, Issue } from "./types";
import { userById } from "./users";
import { ISSUES } from "./issues";

export const INBOX: InboxItem[] = [
  {
    id: "ib_1",
    type: "assignment",
    issueId: "i_1001",
    actorId: "u_aria",
    actorName: "Aria Wen",
    createdAt: "2026-06-05T18:02:00Z",
    read: false,
    preview: "Aria assigned you to ENG-1001",
  },
  {
    id: "ib_2",
    type: "mention",
    issueId: "i_1016",
    actorId: "u_kenji",
    actorName: "Kenji Park",
    createdAt: "2026-06-05T17:30:00Z",
    read: false,
    preview: "Kenji mentioned you: 'Aria, can you take a look at the focus-restoration fix?'",
  },
  {
    id: "ib_3",
    type: "review_request",
    issueId: "i_1002",
    actorId: "u_kenji",
    actorName: "Kenji Park",
    createdAt: "2026-06-05T13:48:00Z",
    read: false,
    preview: "Kenji requested your review on ENG-1002",
  },
  {
    id: "ib_4",
    type: "status_change",
    issueId: "i_1007",
    actorId: "u_sven",
    actorName: "Sven Larsson",
    createdAt: "2026-06-05T12:14:00Z",
    read: true,
    preview: "Sven moved ENG-1007 to Todo",
  },
  {
    id: "ib_5",
    type: "comment",
    issueId: "i_1003",
    actorId: "u_aria",
    actorName: "Aria Wen",
    createdAt: "2026-06-05T11:08:00Z",
    read: true,
    preview: "Aria commented on ENG-1003",
  },
  {
    id: "ib_6",
    type: "due",
    issueId: "i_1002",
    actorName: "rejira",
    createdAt: "2026-06-05T09:00:00Z",
    read: true,
    preview: "ENG-1002 is due tomorrow",
  },
  {
    id: "ib_7",
    type: "comment",
    issueId: "i_1012",
    actorId: "u_kenji",
    actorName: "Kenji Park",
    createdAt: "2026-06-04T20:33:00Z",
    read: true,
    preview: "Kenji pushed a commit on ENG-1012's branch",
  },
  {
    id: "ib_8",
    type: "status_change",
    issueId: "i_1011",
    actorId: "u_aria",
    actorName: "Aria Wen",
    createdAt: "2026-06-04T16:45:00Z",
    read: true,
    preview: "Aria marked ENG-1011 as Done",
  },
  {
    id: "ib_9",
    type: "assignment",
    issueId: "i_1020",
    actorId: "u_aria",
    actorName: "Aria Wen",
    createdAt: "2026-06-04T11:20:00Z",
    read: true,
    preview: "Aria assigned you to ENG-1020",
  },
  {
    id: "ib_10",
    type: "comment",
    issueId: "i_1029",
    actorId: "u_maya",
    actorName: "Maya Okafor",
    createdAt: "2026-06-04T09:50:00Z",
    read: true,
    preview: "Maya commented on DSG-204",
  },
];

export function inboxFor(issueId: string): Issue | undefined {
  return ISSUES.find((i) => i.id === issueId);
}


