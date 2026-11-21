
const connectDB = require("./db");

const {
  RiverData,
  WeatherData,
  Shelter,
  FloodAlert
} = require("./models");

const showDatabaseData = async () => {
  try {
    await connectDB();

    // Get latest river readings
    const rivers = await RiverData.find()
      .sort({ recordedAt: -1 });

    console.log("\nRiver Data:");
    console.log(rivers);

    // Get weather information
    const weather = await WeatherData.find()
      .sort({ recordedAt: -1 });

    console.log("\nWeather Data:");
    console.log(weather);

    // Get available shelters
    const shelters = await Shelter.find({
      status: "available"
    });

    console.log("\nAvailable Shelters:");
    console.log(shelters);

    // Get flood alerts
    const alerts = await FloodAlert.find()
      .sort({ createdAt: -1 });

    console.log("\nFlood Alerts:");
    console.log(alerts);

  } catch (error) {
    console.error("Query failed:", error.message);
  } finally {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
  }
};

showDatabaseData();
