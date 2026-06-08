import { getMembershipsWithUsers } from "@/lib/db/rsc";
import { MembersTabs } from "@/components/team/members-tabs";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const memberships = await getMembershipsWithUsers();
  return <MembersTabs initialMemberships={memberships} />;
}
