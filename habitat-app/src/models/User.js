import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
    },
    password: {
      type: String,
      // Not required because of social login
    },
    image: {
      type: String,
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    provider: {
      type: String,
      default: 'credentials',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// Check if model exists already to prevent overwrite error in development with hot reloading
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;