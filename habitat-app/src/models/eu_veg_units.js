import mongoose from 'mongoose';

const euVegUnitSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  EVC_code: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    
  },
  description: {
    type: String,
  
  },
  name_without_authority: {
    type: String,
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Create indexes for frequently queried fields
euVegUnitSchema.index({ code: 1 });
euVegUnitSchema.index({ EVC_code: 1 });

const EuVegUnits = mongoose.models.eu_veg_units || mongoose.model('eu_veg_units', euVegUnitSchema);

module.exports = EuVegUnits;