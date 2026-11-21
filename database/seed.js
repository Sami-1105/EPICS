
const connectDB = require("./db");

const {
  RiverData,
  WeatherData,
  Shelter,
  FloodAlert
} = require("./models");

const seedDatabase = async () => {
  try {
    await connectDB();

    // Sample river reading
    await RiverData.findOneAndUpdate(
      { riverName: "Betwa", stationName: "Sample Station" },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [77.80, 23.52]
          },
          waterLevel: 8.2,
          warningLevel: 9.0,
          dangerLevel: 10.0
        }
      },
      { upsert: true, new: true }
    );

    // Sample weather reading
    await WeatherData.findOneAndUpdate(
      { rainfall: 45, temperature: 28, humidity: 75 },
      {
        $set: {
          rainfall: 45,
          temperature: 28,
          humidity: 75
        }
      },
      { upsert: true, new: true }
    );

    // Sample shelter
    await Shelter.findOneAndUpdate(
      { name: "Sample Relief Shelter" },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [77.81, 23.53]
          },
          capacity: 100,
          status: "available",
          facilities: ["Food", "Water", "First Aid"]
        }
      },
      { upsert: true, new: true }
    );

    // Sample flood alert
    await FloodAlert.findOneAndUpdate(
      { message: "Sample flood alert for testing" },
      {
        $set: {
          message: "Sample flood alert for testing",
          riskScore: 65,
          riskLevel: "moderate"
        }
      },
      { upsert: true, new: true }
    );

    console.log("Sample data inserted or updated successfully!");

  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
  }
};

seedDatabase();
