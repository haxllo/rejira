CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_cron;--> statement-breakpoint
CREATE TYPE "public"."activity_verb" AS ENUM('created', 'updated', 'deleted', 'archived', 'restored', 'assigned', 'unassigned', 'commented', 'status_changed', 'priority_changed');--> statement-breakpoint
CREATE TYPE "public"."audit_event" AS ENUM('auth_signin', 'auth_signup', 'auth_signout', 'auth_failed', 'password_reset', 'email_verified', 'two_factor_enabled', 'two_factor_disabled', 'workspace_created', 'workspace_archived', 'member_added', 'member_removed', 'role_changed', 'data_export_requested', 'account_deleted');--> statement-breakpoint
CREATE TYPE "public"."cycle_status" AS ENUM('planned', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('issue_assigned', 'issue_mentioned', 'issue_commented', 'issue_status_changed', 'cycle_started', 'cycle_ended');--> statement-breakpoint
CREATE TYPE "public"."priority_key" AS ENUM('urgent', 'high', 'medium', 'low', 'none');--> statement-breakpoint
CREATE TYPE "public"."role_key" AS ENUM('owner', 'admin', 'member', 'guest');--> statement-breakpoint
CREATE TYPE "public"."status_key" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_id" bigint NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "workspaces_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_color" text,
	"avatar_url" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"user_id" bigint NOT NULL,
	"workspace_id" bigint NOT NULL,
	"role" "role_key" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_letter" text,
	"icon_color" text,
	"lead_id" bigint,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" bigint NOT NULL,
	"user_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"project_id" bigint NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "labels_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"project_id" bigint NOT NULL,
	"key" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "status_key" DEFAULT 'backlog' NOT NULL,
	"priority" "priority_key" DEFAULT 'none' NOT NULL,
	"assignee_ids" integer[],
	"label_ids" integer[],
	"cycle_id" bigint,
	"due_date" timestamp with time zone,
	"estimate_points" integer,
	"parent_id" bigint,
	"archived_at" timestamp with time zone,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issues_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "issues_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "issue_assignees" (
	"issue_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"workspace_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"project_id" bigint NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"status" "cycle_status" DEFAULT 'planned' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"goal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cycles_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "cycle_issues" (
	"cycle_id" bigint NOT NULL,
	"issue_id" bigint NOT NULL,
	"workspace_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"owner_id" bigint NOT NULL,
	"name" text NOT NULL,
	"filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"group_by" text,
	"sort_key" text,
	"sort_dir" text DEFAULT 'asc',
	"starred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_views_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"issue_id" bigint NOT NULL,
	"author_id" bigint NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"type" "notification_type" NOT NULL,
	"issue_id" bigint,
	"read" boolean DEFAULT false NOT NULL,
	"snoozed_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"actor_id" bigint NOT NULL,
	"verb" "activity_verb" NOT NULL,
	"object_type" text NOT NULL,
	"object_id" bigint NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"workspace_id" bigint NOT NULL,
	"issue_id" bigint,
	"uploader_id" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" bigint,
	"actor_workspace_id" bigint,
	"event" "audit_event" NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_users_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_issues" ADD CONSTRAINT "cycle_issues_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_issues" ADD CONSTRAINT "cycle_issues_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_issues" ADD CONSTRAINT "cycle_issues_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_external_id_idx" ON "workspaces" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_external_id_idx" ON "users" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_workspace_idx" ON "memberships" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_workspace_id_idx" ON "memberships" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "memberships_workspace_role_idx" ON "memberships" USING btree ("workspace_id","role");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_key_idx" ON "projects" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "projects_workspace_archived_idx" ON "projects" USING btree ("workspace_id","archived_at");--> statement-breakpoint
CREATE INDEX "projects_external_id_idx" ON "projects" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_idx" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "labels_workspace_project_idx" ON "labels" USING btree ("workspace_id","project_id");--> statement-breakpoint
CREATE INDEX "labels_workspace_id_idx" ON "labels" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "labels_name_idx" ON "labels" USING btree ("name");--> statement-breakpoint
CREATE INDEX "issues_workspace_id_idx" ON "issues" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "issues_workspace_status_idx" ON "issues" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "issues_workspace_project_idx" ON "issues" USING btree ("workspace_id","project_id");--> statement-breakpoint
CREATE INDEX "issues_workspace_assignee_ids_idx" ON "issues" USING gin ("assignee_ids");--> statement-breakpoint
CREATE INDEX "issues_workspace_label_ids_idx" ON "issues" USING gin ("label_ids");--> statement-breakpoint
CREATE INDEX "issues_workspace_due_date_idx" ON "issues" USING btree ("workspace_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_number_idx" ON "issues" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "issues_key_idx" ON "issues" USING btree ("key");--> statement-breakpoint
CREATE INDEX "issues_external_id_idx" ON "issues" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_assignees_issue_user_idx" ON "issue_assignees" USING btree ("issue_id","user_id");--> statement-breakpoint
CREATE INDEX "issue_assignees_user_workspace_idx" ON "issue_assignees" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "issue_assignees_issue_id_idx" ON "issue_assignees" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_assignees_workspace_id_idx" ON "issue_assignees" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "cycles_workspace_id_idx" ON "cycles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "cycles_project_id_idx" ON "cycles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cycles_workspace_project_status_idx" ON "cycles" USING btree ("workspace_id","project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_issues_cycle_issue_idx" ON "cycle_issues" USING btree ("cycle_id","issue_id");--> statement-breakpoint
CREATE INDEX "cycle_issues_cycle_id_idx" ON "cycle_issues" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "cycle_issues_issue_id_idx" ON "cycle_issues" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "cycle_issues_workspace_id_idx" ON "cycle_issues" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "saved_views_workspace_owner_idx" ON "saved_views" USING btree ("workspace_id","owner_id");--> statement-breakpoint
CREATE INDEX "saved_views_workspace_owner_starred_idx" ON "saved_views" USING btree ("workspace_id","owner_id","starred");--> statement-breakpoint
CREATE INDEX "comments_workspace_issue_idx" ON "comments" USING btree ("workspace_id","issue_id");--> statement-breakpoint
CREATE INDEX "comments_workspace_issue_created_idx" ON "comments" USING btree ("workspace_id","issue_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "notifications_user_workspace_created_idx" ON "notifications" USING btree ("user_id","workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_workspace_id_idx" ON "notifications" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activities_workspace_created_idx" ON "activities" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activities_workspace_object_idx" ON "activities" USING btree ("workspace_id","object_type","object_id");--> statement-breakpoint
CREATE INDEX "activities_actor_id_idx" ON "activities" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "attachments_workspace_issue_idx" ON "attachments" USING btree ("workspace_id","issue_id");--> statement-breakpoint
CREATE INDEX "attachments_uploader_id_idx" ON "attachments" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX "attachments_workspace_id_idx" ON "attachments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_created_idx" ON "audit_log" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_actor_workspace_created_idx" ON "audit_log" USING btree ("actor_workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_event_created_idx" ON "audit_log" USING btree ("event","created_at" DESC NULLS LAST);