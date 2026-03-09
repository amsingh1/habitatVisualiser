// app/api/community/leaderboards/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Habitat from '@/models/Habitat';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectDB();
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get current date info for dynamic filtering
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Start of current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    
    // Start of current year
    const startOfYear = new Date(currentYear, 0, 1);
    
    // Get recently active users (last 10 who uploaded)
    const recentlyActive = await Habitat.aggregate([
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$user',
          lastUpload: { $first: '$createdAt' },
          uploadCount: { $sum: 1 },
          vegetationTypes: { $addToSet: '$habitatName' },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          habitatName: { $first: '$habitatName' },
          habitatImage: { $first: '$imageUrl' },
          habitatId: { $first: '$_id' }
        }
      },
      {
        $addFields: { vegetationTypeCount: { $size: '$vegetationTypes' } }
      },
      {
        $sort: { lastUpload: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get user IDs for profile picture lookup
    const userIds = recentlyActive.map(u => u._id).filter(id => mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: userIds } }).select('_id name image');
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Format recently active with user details
    const recentlyActiveFormatted = recentlyActive.map(item => ({
      userId: item._id,
      userName: userMap[item._id]?.name || item.userName,
      userImage: userMap[item._id]?.image || null,
      uploadCount: item.uploadCount,
      vegetationTypeCount: item.vegetationTypeCount,
      lastUpload: item.lastUpload,
      habitatName: item.habitatName,
      habitatImage: item.habitatImage ? item.habitatImage[0] : null,
      habitatId: item.habitatId
    }));

    // Most uploads this month
    const mostUploadsThisMonth = await Habitat.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$user',
          uploadCount: { $sum: 1 },
          vegetationTypes: { $addToSet: '$habitatName' },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' }
        }
      },
      {
        $addFields: { vegetationTypeCount: { $size: '$vegetationTypes' } }
      },
      {
        $sort: { uploadCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const monthUserIds = mostUploadsThisMonth.map(u => u._id).filter(id => mongoose.Types.ObjectId.isValid(id));
    const monthUsers = await User.find({ _id: { $in: monthUserIds } }).select('_id name image');
    const monthUserMap = monthUsers.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    const mostUploadsThisMonthFormatted = mostUploadsThisMonth.map(item => ({
      userId: item._id,
      userName: monthUserMap[item._id]?.name || item.userName,
      userImage: monthUserMap[item._id]?.image || null,
      uploadCount: item.uploadCount,
      vegetationTypeCount: item.vegetationTypeCount
    }));

    // Most uploads this year
    const mostUploadsThisYear = await Habitat.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: '$user',
          uploadCount: { $sum: 1 },
          vegetationTypes: { $addToSet: '$habitatName' },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' }
        }
      },
      {
        $addFields: { vegetationTypeCount: { $size: '$vegetationTypes' } }
      },
      {
        $sort: { uploadCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const yearUserIds = mostUploadsThisYear.map(u => u._id).filter(id => mongoose.Types.ObjectId.isValid(id));
    const yearUsers = await User.find({ _id: { $in: yearUserIds } }).select('_id name image');
    const yearUserMap = yearUsers.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    const mostUploadsThisYearFormatted = mostUploadsThisYear.map(item => ({
      userId: item._id,
      userName: yearUserMap[item._id]?.name || item.userName,
      userImage: yearUserMap[item._id]?.image || null,
      uploadCount: item.uploadCount,
      vegetationTypeCount: item.vegetationTypeCount
    }));

    // Most uploads all time
    const mostUploadsAllTime = await Habitat.aggregate([
      {
        $group: {
          _id: '$user',
          uploadCount: { $sum: 1 },
          vegetationTypes: { $addToSet: '$habitatName' },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' }
        }
      },
      {
        $addFields: { vegetationTypeCount: { $size: '$vegetationTypes' } }
      },
      {
        $sort: { uploadCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const allTimeUserIds = mostUploadsAllTime.map(u => u._id).filter(id => mongoose.Types.ObjectId.isValid(id));
    const allTimeUsers = await User.find({ _id: { $in: allTimeUserIds } }).select('_id name image');
    const allTimeUserMap = allTimeUsers.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    const mostUploadsAllTimeFormatted = mostUploadsAllTime.map(item => ({
      userId: item._id,
      userName: allTimeUserMap[item._id]?.name || item.userName,
      userImage: allTimeUserMap[item._id]?.image || null,
      uploadCount: item.uploadCount,
      vegetationTypeCount: item.vegetationTypeCount
    }));

    return NextResponse.json({
      recentlyActive: recentlyActiveFormatted,
      mostUploadsThisMonth: mostUploadsThisMonthFormatted,
      mostUploadsThisYear: mostUploadsThisYearFormatted,
      mostUploadsAllTime: mostUploadsAllTimeFormatted,
      currentMonth: now.toLocaleString('default', { month: 'long' }),
      currentYear: currentYear
    });
  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
