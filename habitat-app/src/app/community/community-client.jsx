'use client';

import { useState, useEffect } from 'react';
import LeaderboardSection from '@/components/community/LeaderboardSection';

export default function CommunityClient() {
  const [leaderboards, setLeaderboards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/community/leaderboards');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboards');
      }
      
      const data = await response.json();
      setLeaderboards(data);
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading leaderboards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!leaderboards) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Leaderboards</h1>
        <p className="text-sm text-gray-500">
          Updated daily (less than a minute ago)
        </p>
      </div>

      {/* Recently Active Section - Full Width Grid */}
      <div className="mb-12">
        <LeaderboardSection
          title="Recently Active"
          users={leaderboards.recentlyActive}
          showTimestamp={true}
          layoutType="grid"
        />
      </div>

      {/* Two Column Layout for Monthly and Yearly Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Most Uploads This Month */}
        <div>
          <LeaderboardSection
            title={`Most uploads in ${leaderboards.currentMonth} ${leaderboards.currentYear}`}
            users={leaderboards.mostUploadsThisMonth}
            showTimestamp={false}
            layoutType="list"
          />
        </div>

        {/* Most Uploads This Year */}
        <div>
          <LeaderboardSection
            title={`Most uploads in ${leaderboards.currentYear}`}
            users={leaderboards.mostUploadsThisYear}
            showTimestamp={false}
            layoutType="list"
          />
        </div>
      </div>
    </div>
  );
}
