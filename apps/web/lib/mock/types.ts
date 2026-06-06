export type UserId = string;
export type ProjectId = string;
export type IssueId = string;
export type CycleId = string;
export type LabelId = string;
export type CommentId = string;

export type StatusKey =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

export type PriorityKey = "urgent" | "high" | "medium" | "low" | "none";

export type User = {
  id: UserId;
  name: string;
  email: string;
  role: "admin" | "member" | "guest";
  status: "online" | "away" | "offline";
  avatarColor: string;
};

export type Project = {
  id: ProjectId;
  key: string;
  name: string;
  description: string;
  iconLetter: string;
  iconColor: string;
  lead: UserId;
  members: UserId[];
  cycles: CycleId[];
};

export type Cycle = {
  id: CycleId;
  number: number;
  projectId: ProjectId;
  name: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed";
  goal: string;
};

export type Label = {
  id: LabelId;
  name: string;
  projectId: ProjectId;
};

export type Comment = {
  id: CommentId;
  issueId: IssueId;
  authorId: UserId;
  body: string;
  createdAt: string;
  reactions: { emoji: string; count: number; users: UserId[] }[];
};

export type Activity = {
  id: string;
  issueId: IssueId;
  actorId: UserId;
  type:
    | "created"
    | "status_changed"
    | "assignee_changed"
    | "priority_changed"
    | "label_added"
    | "label_removed"
    | "commented"
    | "mentioned"
    | "due_changed"
    | "title_changed";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Issue = {
  id: IssueId;
  key: string;
  number: number;
  projectId: ProjectId;
  cycleId?: CycleId;
  title: string;
  description: string;
  status: StatusKey;
  priority: PriorityKey;
  assigneeIds: UserId[];
  authorId: UserId;
  labelIds: LabelId[];
  estimatePoints?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  subIssueIds: IssueId[];
  parentId?: IssueId;
  blockedBy: IssueId[];
  pr?: { number: number; repo: string; status: "open" | "merged" | "closed" };
  urlCount: number;
  attachmentCount: number;
  /** Transient flag: true for the brief window after a mutation starts. */
  pending?: boolean;
  /** True once the issue has been archived (filtered out by default views). */
  archived?: boolean;
};

export type InboxItem = {
  id: string;
  type: "assignment" | "mention" | "status_change" | "comment" | "due" | "review_request" | "review" | "status";
  issueId: IssueId;
  actorId?: UserId;
  actorName: string;
  createdAt: string;
  read: boolean;
  snoozedUntil?: string;
  preview?: string;
};
