import mongoose from 'mongoose';

const HabitatSchema = new mongoose.Schema(
  {
    habitatName: {
      type: String,
      required: [true, 'Please provide a habitat name'],
    },
    state: {
      type: String,
      required: [true, 'Please provide a state'],
    },
    country: {
      type: String,
      required: [true, 'Please provide a country'],
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
    dominantSpecies1: {
      type: String,
    },
    dominantSpecies2: {
      type: String,
    },
    dominantSpecies3: {
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
    },
    code: {
      type: String,
      default: '',
    },
    EVC_code: {
      type: String,
      default: '',
    },
    vegClass: {
      type: String,
      default: '',
    },
    vegOrder: {
      type: String,
      default: '',
    },
    vegAlliance: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Force delete cached model to ensure schema updates are applied
if (mongoose.models.Habitat) {
  delete mongoose.models.Habitat;
}

const Habitat = mongoose.model('Habitat', HabitatSchema);

export default Habitat;