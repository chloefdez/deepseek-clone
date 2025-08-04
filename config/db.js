import mongoose from "mongoose";

let cached = global.mongoose || { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("🔌 Connecting to:", process.env.MONGODB_URI);
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: "deepseek",
      })
      .then((mongoose) => {
        console.log("✅ MongoDB connected");
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.log("❌ Error connecting to MongoDB:", error);
  }

  global.mongoose = cached;
  return cached.conn;
}
