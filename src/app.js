/**
 * app.js — Express application setup
 * Registers global middleware, routes, and error handlers.
 * Best Practices: Helmet (security headers), Compression, Rate Limiting.
 */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const orderRoutes = require("./routes/order.routes");
const { notFound, globalErrorHandler } = require("./middleware/error.middleware");

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
// Helmet sets secure HTTP headers (XSS, clickjacking, sniffing protection).
app.use(helmet());

// ─── Gzip Compression ─────────────────────────────────────────────────────────
// Compresses responses > 1KB, significantly reducing payload size.
app.use(compression());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Max 100 requests per IP per 15 minutes to prevent brute-force / DDoS.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/orders", apiLimiter);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Limit body size to 10kb to prevent payload attacks.
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev")); // HTTP request logger
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Order Management API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/orders", orderRoutes);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

module.exports = app;
