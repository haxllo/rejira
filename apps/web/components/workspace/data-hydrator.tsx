'use client';

import * as React from 'react';
import { useUsersStore } from '@/lib/state/users';
import { useLabelsStore } from '@/lib/state/labels';
import { useProjectsStore } from '@/lib/state/projects';
import { useIssues } from '@/lib/state/issues';
import type { User, Label, Project, Issue } from '@/lib/db/types';

interface Props {
  users: User[];
  labels: Label[];
  projects: Project[];
  issues: Issue[];
}

export function WorkspaceDataHydrator({ users, labels, projects, issues }: Props) {
  const hydrateUsers = useUsersStore((s) => s.hydrate);
  const hydrateLabels = useLabelsStore((s) => s.hydrate);
  const hydrateProjects = useProjectsStore((s) => s.hydrate);
  const hydrateIssues = useIssues((s) => s.hydrate);

  React.useEffect(() => {
    hydrateUsers(users);
  }, [users, hydrateUsers]);

  React.useEffect(() => {
    hydrateLabels(labels);
  }, [labels, hydrateLabels]);

  React.useEffect(() => {
    hydrateProjects(projects);
  }, [projects, hydrateProjects]);

  React.useEffect(() => {
    hydrateIssues(issues);
  }, [issues, hydrateIssues]);

  return null;
}
