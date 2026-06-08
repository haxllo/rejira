# Database Failover

## Regional Outage Response

### 1. Confirm the Incident
Check https://status.supabase.io for active incidents in your region.

### 2. Assess Impact
- Is the database reachable? Run `supabase db ping`
- Can clients connect? Check application error rates
- Which services are affected? (Web, API, Realtime, Storage)

### 3. Communicate
Phase 8 adds:
- Status page update (status.rejira.app)
- Email notification to affected workspace admins

### 4. Read Replica Promotion (Supabase Pro)
If read replicas are configured:
1. Go to Supabase Dashboard → Database → Read Replicas
2. Select the replica in a healthy region
3. Click "Promote to primary"
4. Update `DATABASE_URL`, `DIRECT_URL`, `DATABASE_URL_SESSION` env vars in Vercel
5. Redeploy the application

### 5. Post-Mortem
- Document the incident timeline
- Update this runbook with lessons learned
- Schedule a follow-up restore drill if any gaps found

## PITR Verification
PITR is enabled in Supabase Dashboard at Settings → Database → Point in Time Recovery.
Verify retention is at least 7 days.
