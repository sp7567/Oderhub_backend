/**
 * routes/order.routes.js — All /orders endpoints with validation rules.
 */

const { Router } = require("express");
const { body, query, param } = require("express-validator");
const orderController = require("../controllers/order.controller");
const validate = require("../middleware/validate.middleware");

const router = Router();

// ─── POST /orders ──────────────────────────────────────────────────────────────

router.post(
  "/",
  [
    body("store_id")
      .trim()
      .notEmpty()
      .withMessage("store_id is required"),

    body("items")
      .isArray({ min: 1 })
      .withMessage("items must be a non-empty array"),

    body("items.*.item_id")
      .trim()
      .notEmpty()
      .withMessage("Each item must have an item_id"),

    body("items.*.qty")
      .isInt({ min: 1 })
      .withMessage("Each item qty must be a positive integer"),

    body("total_amount")
      .isFloat({ min: 0 })
      .withMessage("total_amount must be a non-negative number"),
  ],
  validate,
  orderController.createOrder
);

// ─── GET /orders ───────────────────────────────────────────────────────────────

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be 1-100"),
    query("store_id").optional().trim(),
    query("search").optional().trim(),
  ],
  validate,
  orderController.getOrders
);

// ─── GET /orders/stats ────────────────────────────────────────────────────────
// ⚠ Must be declared BEFORE /:id to avoid "stats" being treated as a MongoId

router.get("/stats", orderController.getOrderStats);
router.post("/archive", orderController.archiveOldOrders);
router.get("/analytics", orderController.getAnalytics);

// ─── GET /orders/:id ───────────────────────────────────────────────────────────

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid order ID")],
  validate,
  orderController.getOrderById
);

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────

router.patch(
  "/:id/status",
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("status")
      .isIn(["PLACED", "PREPARING", "COMPLETED"])
      .withMessage("status must be one of: PLACED, PREPARING, COMPLETED"),
  ],
  validate,
  orderController.updateOrderStatus
);

// ─── DELETE /orders/:id ───────────────────────────────────────────────────────

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid order ID")],
  validate,
  orderController.deleteOrder
);

module.exports = router;
