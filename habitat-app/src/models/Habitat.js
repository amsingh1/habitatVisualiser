import mongoose from 'mongoose';

const HabitatSchema = new mongoose.Schema(
  {
    habitatName: {
      type: String,
      required: [true, 'Please provide a habitat name'],
    },
    location: {
      type: String,
      required: [true, 'Please provide a location'],
    },
    gpsCoordinate: {
      type: String,
      required: [true, 'Please provide a coordinate'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date'],
      default: Date.now,
    },
    notes: {
      type: String,
    },
    imageUrl: {
      type: [String],
      required: [true, 'Image URL is required'],
    },
    user: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    }
  },
  { timestamps: true }
);

// Check if model exists already to prevent overwrite error in development with hot reloading
const Habitat = mongoose.models.Habitat || mongoose.model('Habitat', HabitatSchema);

export default Habitat;