const mongoose = require('mongoose');

const kneeDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  kneeAngle: {
    type: Number,
    required: true,
    min: 0,
    max: 180
  },
  temperature: {
    type: Number,
    required: true,
    min: 0,
    max: 50
  },
  flexRaw: {
    type: Number,
    required: true,
    min: 0,
    max: 4096
  },
  status: {
    type: String,
    required: true,
    enum: ['Normal Knee Health', 'Mild OA Symptoms', 'Moderate OA', 'Severe OA / Inflammation']
  },
  deviceInfo: {
    uptime: Number,
    lastUpdate: Number,
    deviceIp: String,
    wifiConnected: Boolean
  },
  sessionInfo: {
    sessionId: String,
    duration: Number,
    measurementsCount: Number
  }
}, {
  timestamps: true
});

// Indexes for better query performance
kneeDataSchema.index({ userId: 1, timestamp: -1 });
kneeDataSchema.index({ deviceId: 1, timestamp: -1 });
kneeDataSchema.index({ status: 1 });
kneeDataSchema.index({ timestamp: -1 });

// Virtual for formatted timestamp
kneeDataSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Virtual for knee angle category
kneeDataSchema.virtual('angleCategory').get(function() {
  if (this.kneeAngle >= 140) return 'Excellent';
  if (this.kneeAngle >= 120) return 'Good';
  if (this.kneeAngle >= 100) return 'Fair';
  return 'Poor';
});

// Virtual for temperature category
kneeDataSchema.virtual('temperatureCategory').get(function() {
  if (this.temperature < 34.5) return 'Normal';
  if (this.temperature < 36.0) return 'Mild';
  if (this.temperature < 37.5) return 'Elevated';
  return 'High';
});

module.exports = mongoose.model('KneeData', kneeDataSchema);
