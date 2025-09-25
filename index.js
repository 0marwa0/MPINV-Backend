import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import QRCode from "qrcode";
import fetch from "node-fetch";
import path from "path";
import FormData from "form-data";
import fs from "fs";
import crypto from "crypto";
import connectDB from "./db_connection.js";
import { Lead } from "./modles/leads.js";
import { Listing } from "./modles/listing.js";
dotenv.config();
import { imageOverlay } from "./fun.js";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const WATI_API_URL =
  process.env.WATI_API_URL || " https://live-mt-server.wati.io/481115";
const WATI_API_TOKEN =
  process.env.WATI_API_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiOThlNGJiMC04YzEyLTQ0MjItOWE5NC1lNGViOTlkMWZjM2YiLCJ1bmlxdWVfbmFtZSI6Im1haG1vdWQuYXNob3VyQG1waW52LmFlIiwibmFtZWlkIjoibWFobW91ZC5hc2hvdXJAbXBpbnYuYWUiLCJlbWFpbCI6Im1haG1vdWQuYXNob3VyQG1waW52LmFlIiwiYXV0aF90aW1lIjoiMDkvMDkvMjAyNSAwODo0NjoyMSIsInRlbmFudF9pZCI6IjQ4MTExNSIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.8Yw-E_eYpvmaGhxQNxgdhpaD6v-vMssFD12DETq3v6I";

await mongoose.connect(
  "mongodb+srv://MPINV:0000@cluster0.wh2mnc2.mongodb.net/test?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
console.log("✅ MongoDB connected");

//connectDB();
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

    // Normalize phone number (digits only)
    let phone = listing.phone.trim();
    if (phone.startsWith("0")) phone = "971" + phone.slice(1); // UAE default

    // Generate QR Code → save in /public/qr
    const qrDir = path.join("public", "qr");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);
    const voucherCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const qrPath = path.join(qrDir, `${voucherCode}.png`);
    await QRCode.toFile(qrPath, `${voucherCode}`, {
      width: 300,
    });

    // Build form-data payload (upload mode)
    const form = new FormData();
    form.append(
      "caption",
      `Hello ${listing.name}, here’s your voucher: ${voucherCode} 🎉`
    );

    const finalImagePath = await imageOverlay(qrPath, voucherCode);
    form.append("file", fs.createReadStream(finalImagePath));

    // Call WATI API
    const response = await fetch(
      `${WATI_API_URL}/api/v1/sendSessionFile/${phone}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WATI_API_TOKEN}`,
          ...form.getHeaders(),
        },
        body: form,
      }
    );

    // Read raw response safely
    const text = await response.text();
    //console.log(" WATI response:", text);

    let data;
    try {
      data = JSON.parse(text); // parse if JSON
    } catch {
      data = { raw: text }; // fallback if plain text
    }

    if (response.ok) {
      console.log("✅ WATI message sent:", JSON.stringify(data, null, 2));
      res.json({ success: true, data });
    } else {
      console.error("❌ Failed to send:", JSON.stringify(data, null, 2));
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

// Example call

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
