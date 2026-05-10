/**
 * middleware/validate.middleware.js
 * Runs express-validator results and returns 422 if any errors are present.
 */

const { validationResult } = require("express-validator");
const { sendError } = require("../utils/ApiResponse");

/**
 * Attach after an array of express-validator checks.
 * If validation fails it short-circuits the request with 422 and a list of errors.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extracted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, 422, "Validation failed", extracted);
  }
  next();
};

module.exports = validate;
