/**
 * controllers/order.controller.js — Thin HTTP layer.
 * Delegates all business logic to order.service.js
 * and formats the HTTP response using ApiResponse helpers.
 */

const orderService = require("../services/order.service");
const { sendSuccess } = require("../utils/ApiResponse");

/**
 * POST /orders
 * Create a new order.
 */
const createOrder = async (req, res, next) => {
  try {
    const { store_id, items, total_amount } = req.body;
    const order = await orderService.createOrder({ store_id, items, total_amount });
    sendSuccess(res, 201, "Order created successfully", order);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /orders?store_id=&page=&limit=&search=
 * Fetch paginated orders, optionally filtered by store.
 */
const getOrders = async (req, res, next) => {
  try {
    const { store_id, page = 1, limit = 10, search = "" } = req.query;

    const result = await orderService.getOrders({
      store_id,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Cap at 100 per page
      search,
    });

    const { orders, total, totalPages } = result;

    sendSuccess(res, 200, "Orders fetched successfully", orders, {
      total,
      page: result.page,
      limit: result.limit,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /orders/:id
 * Get a single order by ID.
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    sendSuccess(res, 200, "Order fetched successfully", order);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /orders/:id/status
 * Update order status (enforces state machine transitions).
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);
    sendSuccess(res, 200, "Order status updated successfully", order);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /orders/stats
 * Return aggregate KPI data for the dashboard (no pagination needed).
 */
const getOrderStats = async (req, res, next) => {
  try {
    const { store_id } = req.query;
    const filter = store_id ? { store_id } : {};
    const stats = await orderService.getOrderStats(filter);
    sendSuccess(res, 200, "Stats fetched successfully", stats);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /orders/:id
 * Permanently remove an order from the database.
 */
const deleteOrder = async (req, res, next) => {
  try {
    await orderService.deleteOrder(req.params.id);
    sendSuccess(res, 200, "Order deleted successfully");
  } catch (err) {
    next(err);
  }
};

const archiveOldOrders = async (req, res, next) => {
  try {
    const result = await orderService.archiveOldOrders();
    sendSuccess(res, 200, "Old orders archived successfully", result);
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [ordersPerDay, revenuePerStore, topItems] = await Promise.all([
      orderService.getOrdersPerDay(),
      orderService.getRevenuePerStore(),
      orderService.getTopSellingItems(),
    ]);

    sendSuccess(res, 200, "Analytics fetched successfully", {
      ordersPerDay,
      revenuePerStore,
      topItems,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  archiveOldOrders,
  getAnalytics,
};
