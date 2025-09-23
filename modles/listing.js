import mongoose from "mongoose";

const ListingSchema = new mongoose.Schema({
  location: { type: String, required: true },
  state: { type: String, enum: ["Ready", "Offplan"], required: true },
  type: {
    type: String,
    enum: [
      "Villa",
      "Apartment",
      "Studio",
      "Townhouse",
      "Penthouse",
      "Duplex",
      "Full floor",
      "Half floor",
      "Whole Building",
      "Hotel Apartment (HA)",
      "Plot",
      "Residential Land",
      "Office",
    ],
    required: true,
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  beds: { type: String, required: true },
  phone: { type: String, required: true }, // WhatsApp number
  voucher: { type: String, default: "" }, // empty string by default
  voucherSent: { type: Boolean, default: false }, // not sent initially
  createdAt: { type: Date, default: Date.now },
});
export const Listing = mongoose.model("Listing", ListingSchema);
