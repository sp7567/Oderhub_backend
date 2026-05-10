/**
 * utils/ApiResponse.js — Standardised JSON response helper.
 * Ensures consistent response shapes across all endpoints.
 */

/**
 * Send a successful JSON response.
 * @param {Response} res
 * @param {number}   statusCode
 * @param {string}   message
 * @param {*}        data
 * @param {object}   [meta]  — Optional pagination or extra metadata
 */
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Send an error JSON response.
 * @param {Response} res
 * @param {number}   statusCode
 * @param {string}   message
 * @param {Array}    [errors]
 */
const sendError = (res, statusCode, message, errors = []) => {
  const response = { success: false, message };
  if (errors.length > 0) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
