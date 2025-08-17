const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Candidate = require("./models/Candidate");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected...");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

connectDB();

// --- API Endpoints ---

// GET all candidates
app.get("/api/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// POST a new candidate
app.post("/api/candidates", async (req, res) => {
  try {
    const newCandidate = new Candidate(req.body);
    await newCandidate.save();
    res.status(201).json(newCandidate);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// PUT update candidate stage
app.put("/api/candidates/:id", async (req, res) => {
  const { id } = req.params;
  const { currentStage } = req.body;

  try {
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { currentStage },
      { new: true }
    );
    if (!candidate) {
      return res.status(404).json({ msg: "Candidate not found" });
    }
    res.json(candidate);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Analytics - count of candidates per stage
app.get("/api/analytics/stages", async (req, res) => {
  try {
    const data = await Candidate.aggregate([
      { $group: { _id: "$currentStage", count: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
