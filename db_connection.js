import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb+srv://MPINV:0000@cluster0.wh2mnc2.mongodb.net/test?retryWrites=true&w=majority";
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Mongo error:", err.message);
    process.exit(1); // Exit if DB connection fails
  }
};

export default connectDB;
