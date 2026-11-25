require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const { protect, authorize } = require("./middleware/authMiddleware");

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "FloodWatch API is running!" });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Admin-only test route
app.get(
  "/api/admin/dashboard",
  protect,
  authorize("admin"),
  (req, res) => {
    res.json({
      message: "Welcome to the admin dashboard.",
      user: req.user.name
    });
  }
);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from .env");
    process.exit(1);
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`FloodWatch API running on port ${PORT}`);
  });
};

startServer();