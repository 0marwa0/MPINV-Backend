// 2. Define Schema + Model
import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  country: String,
  experience: String,
});
export const Lead = mongoose.model("Lead", LeadSchema);
