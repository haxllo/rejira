# Restore Drill (Quarterly Exercise)

## Pre-Drill Checklist
- [ ] Confirm PITR is enabled in Supabase Dashboard (Settings → Database → PITR)
- [ ] Confirm the latest migration is in `main`
- [ ] Notify the team (Slack: #eng-restore-drill)

## Step 1: Create Restore Project
1. Go to Supabase Dashboard → New Project
2. Name: `rejira-restore-drill`
3. Region: same as production
4. Pricing: Pro (PITR required)

## Step 2: Link and Push Schema
```bash
supabase link --project-ref <new-ref>
supabase db push
```

## Step 3: Restore from PITR
```bash
supabase db restore --project-ref <new-ref> --timestamp <30-min-ago>
```
Replace `<30-min-ago>` with an ISO 8601 timestamp ~30 minutes in the past.

## Step 4: Verify
```bash
npm run db:test          # RLS tests pass with restored data
npm run typecheck        # app compiles against restored schema
```

## Step 5: Document
- Time to restore: ___ minutes (target: < 60 minutes)
- Any errors encountered: ___
- Row counts match: yes/no

## Step 6: Teardown
```bash
supabase db:branch:delete rejira-restore-drill
```
Delete the temporary Supabase project from the Dashboard.
