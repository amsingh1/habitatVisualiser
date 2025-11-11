'use client';

import { useState, useEffect } from 'react';
import LeaderboardSection from '@/components/community/LeaderboardSection';

export default function CommunityClient() {
  const [leaderboards, setLeaderboards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    fetchLeaderboards();
    
    // Update the timestamp display every 30 seconds
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 30000);
    
    return () => clearInterval(interval);
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
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUpdateTimeText = () => {
    if (!lastUpdated) return 'Loading...';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - lastUpdated) / 1000);
    
    if (diffInSeconds < 60) return 'Updated less than a minute ago';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Updated ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    const hours = Math.floor(diffInSeconds / 3600);
    return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
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
          {getUpdateTimeText()}
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
