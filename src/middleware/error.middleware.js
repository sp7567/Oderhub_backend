/**
 * middleware/error.middleware.js
 * Global error handlers — must be registered LAST in the middleware chain.
 *
 * notFound      — Catches requests that don't match any route (404).
 * globalErrorHandler — Centralized handler for all thrown errors.
 */

const ApiError = require("../utils/ApiError");
const { sendError } = require("../utils/ApiResponse");

/**
 * 404 handler for unmatched routes.
 */
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralised error handler.
 * Handles:
 *  - ApiError instances (operational errors)
 *  - Mongoose ValidationError
 *  - Mongoose CastError (invalid ObjectId)
 *  - Mongoose duplicate key (11000)
 *  - Generic unexpected errors
 */
const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Mongoose validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV !== "production" && !err.isOperational) {
    console.error("💥 Unexpected Error:", err);
  }

  return sendError(res, statusCode, message, errors);
};

module.exports = { notFound, globalErrorHandler };
