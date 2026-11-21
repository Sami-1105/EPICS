
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["user", "admin", "provider"],
    default: "user"
  }
}, { timestamps: true });

const riverDataSchema = new mongoose.Schema({
  riverName: {
    type: String,
    required: true
  },
  stationName: String,
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  waterLevel: Number,
  warningLevel: Number,
  dangerLevel: Number,
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const weatherDataSchema = new mongoose.Schema({
  rainfall: Number,
  temperature: Number,
  humidity: Number,
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const shelterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  capacity: Number,
  status: {
    type: String,
    enum: ["available", "full", "closed"],
    default: "available"
  },
  facilities: [String]
}, { timestamps: true });

shelterSchema.index({ location: "2dsphere" });

const floodAlertSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  riskScore: Number,
  riskLevel: {
    type: String,
    enum: ["low", "moderate", "high", "severe"]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema, "users");

const RiverData = mongoose.model(
  "RiverData",
  riverDataSchema,
  "river_data"
);

const WeatherData = mongoose.model(
  "WeatherData",
  weatherDataSchema,
  "weather_data"
);

const Shelter = mongoose.model("Shelter", shelterSchema, "shelters");

const FloodAlert = mongoose.model(
  "FloodAlert",
  floodAlertSchema,
  "flood_alerts"
);
module.exports = {
  User,
  RiverData,
  WeatherData,
  Shelter,
  FloodAlert
};
