import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connect to MongoDB Atlas
mongoose
  .connect(
    "mongodb+srv://MPINV:0000@cluster0.wh2mnc2.mongodb.net/test?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err));

// 2. Define Schema + Model
const LeadSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  country: String,
  experience: String,
});

const Lead = mongoose.model("Lead", LeadSchema);

// 3. POST endpoint to save lead
app.post("/api/leads", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, country, experience } = req.body;

    const newLead = new Lead({
      firstName,
      lastName,
      email,
      phone,
      country,
      experience,
    });

    await newLead.save();
    res.status(201).json({ success: true, data: newLead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET endpoint to list all leads (optional)
app.get("/api/leads", async (req, res) => {
  try {
    const leads = await Lead.find();
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
