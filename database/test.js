
const mongoose = require("mongoose");
const connectDB = require("./db");

const {
  User,
  RiverData,
  WeatherData,
  Shelter,
  FloodAlert
} = require("./models");

const testDatabase = async () => {
  try {
    await connectDB();

    console.log("\nDatabase connection test successful!");

    console.log("Models loaded successfully:");
    console.log(User.modelName);
    console.log(RiverData.modelName);
    console.log(WeatherData.modelName);
    console.log(Shelter.modelName);
    console.log(FloodAlert.modelName);

    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
  }
};

testDatabase();
