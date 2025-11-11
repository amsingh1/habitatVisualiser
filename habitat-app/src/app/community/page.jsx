import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LayoutWrapper from '@/components/layout-wrapper';
import CommunityClient from './community-client';

export const metadata = {
  title: 'Community - Vegetation Types',
  description: 'View community leaderboards and statistics',
};

export default async function CommunityPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <LayoutWrapper>
      <CommunityClient />
    </LayoutWrapper>
  );
}
