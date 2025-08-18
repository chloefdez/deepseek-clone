import mongoose from "mongoose";
import { env } from "@/env"; 

let cached = global.mongoose || { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {

    cached.promise = mongoose
      .connect(env.MONGODB_URI, { dbName: "deepseek" })
      .then((conn) => {
        console.log("✅ MongoDB connected");
        return conn;
      })
      .catch((err) => {
        console.error("❌ Error connecting to MongoDB:", err);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  global.mongoose = cached;
  return cached.conn;
}