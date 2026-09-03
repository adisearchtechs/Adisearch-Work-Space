import MemberProfileRuntime from '@/components/common/members/member-profile-runtime';

interface MemberProfilePageProps {
   params: Promise<{ memberId: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
   const { memberId } = await params;
   return <MemberProfileRuntime memberId={memberId} />;
}
