import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import QRCode from "qrcode";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve static files (QR codes)

// === WATI CONFIG ===
const WATI_API_URL = "https://live-mt-server.wati.io/481115";
const WATI_API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiOThlNGJiMC04YzEyLTQ0MjItOWE5NC1lNGViOTlkMWZjM2YiLCJ1bmlxdWVfbmFtZSI6Im1haG1vdWQuYXNob3VyQG1waW52LmFlIiwibmFtZWlkIjoibWFobW91ZC5hc2hvdXJAbXBpbnYuYWUiLCJlbWFpbCI6Im1haG1vdWQuYXNob3VyQG1waW52LmFlIiwiYXV0aF90aW1lIjoiMDkvMDkvMjAyNSAwODo0NjoyMSIsInRlbmFudF9pZCI6IjQ4MTExNSIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.8Yw-E_eYpvmaGhxQNxgdhpaD6v-vMssFD12DETq3v6I";

// 1. Connect to MongoDB
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

const ListingSchema = new mongoose.Schema({
  location: { type: String, required: true },
  state: { type: String, enum: ["Ready", "Offplan"], required: true },
  type: {
    type: String,
    enum: ["Villa", "Apartment", "Studio"],
    required: true,
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  beds: { type: String, required: true },
  phone: { type: String, required: true }, // WhatsApp number
  createdAt: { type: Date, default: Date.now },
});
const Listing = mongoose.model("Listing", ListingSchema);

// === ROUTES ===

// Save lead
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

// Get all leads
app.get("/api/leads", async (req, res) => {
  try {
    const leads = await Lead.find();
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save listing
app.post("/api/listings", async (req, res) => {
  try {
    const { location, state, type, name, email, beds, phone } = req.body;
    const newListing = new Listing({
      location,
      state,
      type,
      name,
      email,
      beds,
      phone,
    });
    await newListing.save();
    res.status(201).json({ success: true, data: newListing });
  } catch (err) {
    console.error("❌ Error saving listing:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send voucher via WhatsApp (WATI API)
app.post("/api/listings/:id/send-voucher", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res
        .status(404)
        .json({ success: false, error: "Listing not found" });
    }

    // Normalize phone number for WATI (must be numeric, no "+")
    let phone = listing.phone;
    if (phone.startsWith("0")) {
      phone = "971" + phone; // default UAE prefix
    } else if (phone.startsWith("+")) {
      phone = phone.substring(1);
    }

    // Generate QR Code → save in /public/qr
    const qrDir = path.join("public", "qr");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);
    const qrPath = path.join(qrDir, `${listing._id}.png`);
    const qrUrl = `${req.protocol}://${req.get("host")}/qr/${listing._id}.png`;

    await QRCode.toFile(qrPath, `https://example.com/voucher/${listing._id}`, {
      width: 300,
    });

    // Call WATI API

    const response = await fetch(
      `${WATI_API_URL}/api/v1/sendSessionMessage/${"971" + phone}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WATI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageText: `test voucher 🎉`,
          attachment: qrUrl, // hosted QR image
        }),
      }
    );

    // Parse response safely
    console.log("📞 WATI response status:", response);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Non-JSON response from WATI:", text);
      return res.status(500).json({ success: false, error: text });
    }

    if (response.ok) {
      res.json({ success: true, data });
    } else {
      res.status(500).json({ success: false, error: data });
    }
  } catch (err) {
    console.error("❌ Error sending voucher:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all listings
app.get("/api/listings", async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json({ success: true, data: listings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
