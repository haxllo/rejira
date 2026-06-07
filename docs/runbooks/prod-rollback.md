# Production Rollback Runbook

## Quick Rollback: Vercel

```bash
vercel rollback
```

Or via Dashboard: Vercel > Project > Deployments > Select previous deployment > Promote to Production

This reverts the application to the previous deployment instantly. Database is not affected — migrations are forward-only.

## Database Rollback

### Option 1: Supabase PITR Restore

If a migration caused issues, use Point-in-Time Recovery:
1. Supabase Dashboard > rejira-prod > Database > Backups
2. Select a point-in-time before the migration
3. Create a restore
4. Point application to restored database

### Option 2: Manual Migration Down

1. Connect to production database:
   ```bash
   psql "$DIRECT_URL"
   ```

2. Run migration down scripts (reverse of upgrade SQL).
   Example rollback SQL templates:
   ```sql
   DROP TABLE IF EXISTS workspace_security_policy CASCADE;
   DROP FUNCTION IF EXISTS create_default_workspace_security_policy CASCADE;
   ```

3. Verify schema matches expected state:
   ```bash
   supabase db diff
   ```

### Option 3: Database Branch

If you have Supabase Branching enabled:
1. Create a branch from a pre-migration snapshot
2. Point staging environment to branch
3. Verify, then promote branch to production

## Communication Template

If rollback is necessary, send to users:

```
Subject: rejira maintenance complete

We've completed scheduled maintenance on rejira.
All services are operational.

If you experience any issues, please reach out to support@rejira.dev.

Best,
The rejira team
```

## Incident Postmortem Checklist

- [ ] Root cause documented
- [ ] Timeline recorded
- [ ] Impact assessed (users affected, duration)
- [ ] Preventative measures identified
- [ ] New tests added to catch regression
- [ ] Runbook updated with findings
