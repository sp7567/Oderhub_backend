/**
 * utils/ApiError.js — Custom operational error class.
 * Allows controllers to throw typed errors with HTTP status codes
 * that are caught by the global error handler.
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
   * @param {string} message    - Human-readable error message
   * @param {Array}  errors     - Optional array of validation error details
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Distinguishes from unexpected bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
