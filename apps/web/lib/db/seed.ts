import { db } from './client';
import { workspaces, users, memberships, projects, projectMembers, labels, cycles, issues, issueAssignees, comments, notifications, activities } from './schema';

export async function seed() {
  await db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspaces).values({
      externalId: 'ws_acme_ext',
      name: 'Acme',
      slug: 'acme',
      ownerId: 0n,
    }).onConflictDoNothing().returning();

    const wsId = ws?.id || (await tx.query.workspaces.findFirst({ where: (w, { eq }) => eq(w.slug, 'acme') }))?.id;

    const demoUsers = [
      { ext: 'u_aria', name: 'Aria Chen', email: 'aria@acme.dev' },
      { ext: 'u_kenji', name: 'Kenji Tanaka', email: 'kenji@acme.dev' },
      { ext: 'u_priya', name: 'Priya Singh', email: 'priya@acme.dev' },
      { ext: 'u_diego', name: 'Diego Reyes', email: 'diego@acme.dev' },
      { ext: 'u_lisa', name: 'Lisa Park', email: 'lisa@acme.dev' },
      { ext: 'u_omar', name: 'Omar Hassan', email: 'omar@acme.dev' },
      { ext: 'u_yuki', name: 'Yuki Ito', email: 'yuki@acme.dev' },
      { ext: 'u_sam', name: 'Sam O\'Brien', email: 'sam@acme.dev' },
      { ext: 'u_maya', name: 'Maya Johansson', email: 'maya@acme.dev' },
      { ext: 'u_alex', name: 'Alex Kim', email: 'alex@acme.dev' },
      { ext: 'u_nina', name: 'Nina Patel', email: 'nina@acme.dev' },
      { ext: 'u_tom', name: 'Tom Fischer', email: 'tom@acme.dev' },
    ];

    const userIds: Record<string, bigint> = {};
    for (const u of demoUsers) {
      const [row] = await tx.insert(users).values({
        externalId: u.ext,
        name: u.name,
        email: u.email,
      }).onConflictDoNothing().returning();
      if (row) {
        userIds[u.ext] = BigInt(row.id);
      } else {
        const existing = await tx.query.users.findFirst({ where: (u, { eq }) => eq(u.externalId, u.ext) });
        if (existing) userIds[u.ext] = BigInt(existing.id);
      }
    }

    for (const [ext, uid] of Object.entries(userIds)) {
      await tx.insert(memberships).values({
        externalId: `mem_${ext}`,
        userId: uid,
        workspaceId: wsId!,
        role: ext === 'u_aria' ? 'owner' : 'member',
      }).onConflictDoNothing();
    }

    const projDefs = [
      { ext: 'proj_eng', key: 'ENG', name: 'Engineering', lead: 'u_aria', color: '#4F46E5' },
      { ext: 'proj_des', key: 'DES', name: 'Design', lead: 'u_priya', color: '#DB2777' },
      { ext: 'proj_mkt', key: 'MKT', name: 'Marketing', lead: 'u_diego', color: '#059669' },
      { ext: 'proj_ops', key: 'OPS', name: 'Operations', lead: 'u_kenji', color: '#D97706' },
    ];

    const projectIds: Record<string, bigint> = {};
    for (const p of projDefs) {
      const [row] = await tx.insert(projects).values({
        externalId: p.ext,
        workspaceId: wsId!,
        key: p.key,
        name: p.name,
        iconColor: p.color,
        leadId: userIds[p.lead],
      }).onConflictDoNothing().returning();
      if (row) {
        projectIds[p.key] = BigInt(row.id);
      } else {
        const existing = await tx.query.projects.findFirst({ where: (p, { eq }) => eq(p.key, p.key) });
        if (existing) projectIds[p.key] = BigInt(existing.id);
      }
    }

    for (const [key, pid] of Object.entries(projectIds)) {
      for (const [, uid] of Object.entries(userIds)) {
        await tx.insert(projectMembers).values({
          projectId: pid,
          userId: uid,
        }).onConflictDoNothing();
      }
    }

    const labelDefs = [
      { ext: 'lbl_bug', name: 'Bug', color: '#EF4444' },
      { ext: 'lbl_feature', name: 'Feature', color: '#3B82F6' },
      { ext: 'lbl_improvement', name: 'Improvement', color: '#10B981' },
      { ext: 'lbl_docs', name: 'Documentation', color: '#8B5CF6' },
      { ext: 'lbl_perf', name: 'Performance', color: '#F59E0B' },
      { ext: 'lbl_ux', name: 'UX', color: '#EC4899' },
      { ext: 'lbl_sec', name: 'Security', color: '#6B7280' },
      { ext: 'lbl_blocker', name: 'Blocker', color: '#DC2626' },
      { ext: 'lbl_tech_debt', name: 'Tech Debt', color: '#6366F1' },
      { ext: 'lbl_ops', name: 'Ops', color: '#F97316' },
    ];

    const labelIds: Record<string, bigint> = {};
    for (const l of labelDefs) {
      const [row] = await tx.insert(labels).values({
        externalId: l.ext,
        workspaceId: wsId!,
        projectId: projectIds['ENG']!,
        name: l.name,
        color: l.color,
      }).onConflictDoNothing().returning();
      if (row) {
        labelIds[l.ext] = BigInt(row.id);
      }
    }

    const [cyc1] = await tx.insert(cycles).values({
      externalId: 'cyc_1',
      workspaceId: wsId!,
      projectId: projectIds['ENG']!,
      number: 23,
      name: 'Cycle 23',
      status: 'active',
      goal: 'Ship realtime collaboration MVP',
    }).onConflictDoNothing().returning();

    const [cyc2] = await tx.insert(cycles).values({
      externalId: 'cyc_2',
      workspaceId: wsId!,
      projectId: projectIds['ENG']!,
      number: 24,
      name: 'Cycle 24',
      status: 'planned',
      goal: 'Search and AI features',
    }).onConflictDoNothing().returning();

    const [cyc3] = await tx.insert(cycles).values({
      externalId: 'cyc_3',
      workspaceId: wsId!,
      projectId: projectIds['DES']!,
      number: 12,
      name: 'Sprint 12',
      status: 'completed',
    }).onConflictDoNothing().returning();

    const issueTitles = [
      'Fix login redirect loop on OAuth callback',
      'Add rate limiting to password reset endpoint',
      'Implement workspace switcher keyboard shortcut',
      'Design system: color token audit and refresh',
      'API: add pagination cursor to issues endpoint',
      'Performance: optimize issue list virtual scrolling',
      'Mobile: fix drawer overlay on iOS Safari',
      'Email: customize magic link template with branding',
      'Search: add fuzzy matching for issue titles',
      'Notifications: batch mark-as-read endpoint',
      'Database: add composite index for inbox query',
      'Auth: implement session token rotation',
      'Integration: GitHub PR status sync webhook',
      'UI: add skeleton loading states to all lists',
      'Testing: add E2E test for issue create flow',
      'Docs: write API reference for public endpoints',
      'Storage: implement signed URL rotation policy',
      'Realtime: add presence indicator to issue drawer',
      'Cycles: auto-close cycle when all issues done',
      'Views: persist column reorder to saved views',
      'Audit log: add CSV export with date range filter',
      'Labels: batch create/delete via multi-select',
      'Comments: add markdown preview toggle',
      'Keyboard: add j/k navigation in issue list',
      'Accessibility: add aria-labels to all buttons',
      'Security: add CSP headers to Next.js config',
      'Onboarding: add interactive product walkthrough',
      'Billing: implement usage-based tier calculations',
      'i18n: add Japanese locale support',
      'DevEx: add pre-commit hook for typecheck',
    ];

    const statuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
    const priorities = ['urgent', 'high', 'medium', 'low', 'none'] as const;

    for (let i = 0; i < 30; i++) {
      const [iss] = await tx.insert(issues).values({
        externalId: `i_${1001 + i}`,
        workspaceId: wsId!,
        projectId: projectIds['ENG']!,
        key: `ENG-${String(i + 1).padStart(4, '0')}`,
        number: i + 1,
        title: issueTitles[i],
        description: `Description for: ${issueTitles[i]}`,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        cycleId: i < 15 ? (cyc1?.id || null) : (cyc2?.id || null),
        estimatePoints: (i % 8) + 1,
      }).onConflictDoNothing().returning();

      if (iss) {
        const assigneeKeys = Object.keys(userIds);
        await tx.insert(issueAssignees).values({
          issueId: BigInt(iss.id),
          userId: userIds[assigneeKeys[i % assigneeKeys.length]],
          workspaceId: wsId!,
        }).onConflictDoNothing().returning();
      }
    }

    for (let i = 0; i < 8; i++) {
      await tx.insert(comments).values({
        externalId: `cmt_${1001 + i}`,
        workspaceId: wsId!,
        issueId: BigInt(i + 1),
        authorId: userIds[Object.keys(userIds)[i % Object.keys(userIds).length]],
        body: `Comment ${i + 1}: This is a test comment on issue ${i + 1}.`,
      }).onConflictDoNothing();
    }

    for (let i = 0; i < 10; i++) {
      await tx.insert(notifications).values({
        externalId: `notif_${1001 + i}`,
        workspaceId: wsId!,
        userId: userIds[Object.keys(userIds)[i % Object.keys(userIds).length]],
        type: i % 2 === 0 ? 'issue_assigned' : 'issue_commented',
        issueId: BigInt((i % 30) + 1),
      }).onConflictDoNothing();
    }

    for (let i = 0; i < 5; i++) {
      await tx.insert(activities).values({
        externalId: `act_${1001 + i}`,
        workspaceId: wsId!,
        actorId: userIds[Object.keys(userIds)[i % Object.keys(userIds).length]],
        verb: 'created',
        objectType: 'issues',
        objectId: BigInt(i + 1),
      }).onConflictDoNothing();
    }
  });

  console.log('Seed complete: 1 workspace, 12 users, 12 memberships, 4 projects, 10 labels, 3 cycles, 30 issues, 8 comments, 10 notifications, 5 activities');
}
