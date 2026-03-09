'use client';

import React from 'react';

export default function LeaderboardSection({
  title,
  description,
  users,
  showTimestamp,
  layoutType = 'list',
  scoreKey = 'uploadCount',
  scoreLabelSingular = 'record',
  scoreLabelPlural = 'records',
  showVegTypeCount = true,
}) {
  if (!users || users.length === 0) {
    return (
      <div className="mb-12">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Grid layout for Recently Active
  if (layoutType === 'grid') {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {users.slice(0, 10).map((user) => (
            <UserCard
              key={user.userId}
              user={user}
              showTimestamp={showTimestamp}
              scoreKey={scoreKey}
              scoreLabelSingular={scoreLabelSingular}
              scoreLabelPlural={scoreLabelPlural}
              showVegTypeCount={showVegTypeCount}
            />
          ))}
        </div>
      </div>
    );
  }

  // List layout for leaderboards
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
      <ol className="space-y-3">
        {users.slice(0, 5).map((user, index) => (
          <UserRow
            key={user.userId}
            rank={index + 1}
            user={user}
            showTimestamp={showTimestamp}
            scoreKey={scoreKey}
            scoreLabelSingular={scoreLabelSingular}
            scoreLabelPlural={scoreLabelPlural}
            showVegTypeCount={showVegTypeCount}
          />
        ))}
      </ol>
    </div>
  );
}

// Helper functions
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const formatTimestamp = (date) => {
  try {
    const now = new Date();
    const uploadDate = new Date(date);
    const diffInMs = now - uploadDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `about ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `about ${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 30) return `about ${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `about ${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  } catch (err) {
    return 'recently';
  }
};

// Card component for Recently Active (grid layout)
function UserCard({ user, showTimestamp, scoreKey, scoreLabelSingular, scoreLabelPlural, showVegTypeCount }) {
  const score = user[scoreKey] ?? 0;
  const handleCardClick = () => {
    window.location.href = `/habitats?user=${user.userId}`;
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* User Profile Picture */}
      <div className="relative h-32 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        {user.userImage ? (
          <img
            src={user.userImage}
            alt={user.userName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-xl font-bold text-gray-700">
            {getInitials(user.userName)}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="p-3">
        <h4 className="font-semibold text-sm mb-1 truncate text-blue-600">
          {user.userName}
        </h4>
        {user.habitatName && (
          <p className="text-xs text-gray-600 truncate">added {user.habitatName}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          <span className="text-green-600 font-semibold">{score}</span>
          {' '}{score === 1 ? scoreLabelSingular : scoreLabelPlural}
          {showVegTypeCount && user.vegetationTypeCount != null && (
            <> · <span className="text-blue-600 font-semibold">{user.vegetationTypeCount}</span> {user.vegetationTypeCount === 1 ? 'veg. type' : 'veg. types'}</>
          )}
        </p>
        {showTimestamp && user.lastUpload && (
          <p className="text-xs text-gray-500 mt-1">
            {formatTimestamp(user.lastUpload)}
          </p>
        )}
      </div>
    </div>
  );
}

// Row component for leaderboards (list layout)
function UserRow({ rank, user, showTimestamp, scoreKey, scoreLabelSingular, scoreLabelPlural, showVegTypeCount }) {
  const score = user[scoreKey] ?? 0;
  return (
    <li className="flex items-center space-x-3 py-2">
      {/* Rank */}
      <span className="text-lg font-semibold text-gray-700 w-6">{rank}.</span>

      {/* User Avatar */}
      <div className="flex-shrink-0">
        {user.userImage ? (
          <img
            src={user.userImage}
            alt={user.userName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
            {getInitials(user.userName)}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-grow">
        <div className="flex items-center space-x-2">
          <span className="text-gray-900 font-medium">{user.userName}</span>
        </div>
        <div className="text-sm text-gray-600">
          <span className={`${score > 999 ? 'text-orange-600 font-bold' : 'text-green-600 font-semibold'}`}>
            {score.toLocaleString()}
          </span>
          <span className="text-gray-500"> {score === 1 ? scoreLabelSingular : scoreLabelPlural}</span>
          {showVegTypeCount && user.vegetationTypeCount != null && (
            <span className="text-gray-400">
              {' · '}
              <span className="text-blue-600 font-semibold">{user.vegetationTypeCount.toLocaleString()}</span>
              {' '}{user.vegetationTypeCount === 1 ? 'veg. type' : 'veg. types'}
            </span>
          )}
          {showTimestamp && user.lastUpload && (
            <span className="text-gray-400"> • uploaded {formatTimestamp(user.lastUpload)}</span>
          )}
        </div>
      </div>
    </li>
  );
}

