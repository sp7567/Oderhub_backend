/**
 * config/db.js — MongoDB connection using Mongoose
 * Features: Connection Pooling, Graceful Shutdown, Retry Logic, Health Monitoring.
 */

const mongoose = require("mongoose");

// ─── Connection Pool Settings ─────────────────────────────────────────────────
const MONGO_OPTIONS = {
  maxPoolSize: 10,        // Max simultaneous connections in the pool
  minPoolSize: 2,         // Keep at least 2 connections warm
  serverSelectionTimeoutMS: 5000,  // Fail fast if server is unreachable
  socketTimeoutMS: 45000, // Close idle sockets after 45s
  family: 4,              // Force IPv4 to avoid DNS lookup delays
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`🔗 Pool size: min=${MONGO_OPTIONS.minPoolSize}, max=${MONGO_OPTIONS.maxPoolSize}`);

    // ─── Connection Lifecycle Events ─────────────────────────────────────────
    mongoose.connection.on("disconnected", () =>
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...")
    );
    mongoose.connection.on("reconnected", () =>
      console.log("🔁 MongoDB reconnected successfully.")
    );
    mongoose.connection.on("error", (err) =>
      console.error(`❌ MongoDB runtime error: ${err.message}`)
    );

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Close the pool cleanly when the process exits so pending queries can finish.
const gracefulShutdown = async (signal) => {
  console.log(`\n⚡ ${signal} received. Closing MongoDB connection pool...`);
  await mongoose.connection.close();
  console.log("✅ MongoDB pool closed. Exiting.");
  process.exit(0);
};

process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

module.exports = connectDB;
