/**
 * services/order.service.js — Business logic layer for orders.
 * Controllers call these methods; services interact with Mongoose models.
 * Keeping DB logic here makes controllers thin and testable.
 */

const Order = require("../models/Order");
const OrderArchive = require("../models/orderArchive.model");
const ApiError = require("../utils/ApiError");
const socketIO = require("../utils/socketIO");

/**
 * Archive orders older than 30 days.
 * @returns {Promise<{archivedCount: number}>}
 */
const archiveOldOrders = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Find orders older than 30 days
  const oldOrders = await Order.find({ created_at: { $lt: thirtyDaysAgo } }).lean();

  if (oldOrders.length === 0) {
    return { archivedCount: 0 };
  }

  // 2. Map to Archive format
  const archivedData = oldOrders.map(order => ({
    ...order,
    original_created_at: order.created_at,
    archived_at: new Date(),
    _id: order._id // Keep same ID
  }));

  // 3. Move to Archive Table
  await OrderArchive.insertMany(archivedData);

  // 4. Remove from Main Table
  await Order.deleteMany({ _id: { $in: oldOrders.map(o => o._id) } });

  return { archivedCount: oldOrders.length };
};

// ─── Valid status transition map ──────────────────────────────────────────────
// Only forward transitions are allowed.
const STATUS_TRANSITIONS = {
  PLACED: ["PREPARING"],
  PREPARING: ["COMPLETED"],
  COMPLETED: [], // Terminal state
};

/**
 * Create a new order.
 * @param {object} data - { store_id, items, total_amount }
 * @returns {Promise<Order>}
 */
const createOrder = async (data) => {
  const order = new Order(data);
  await order.save();

  // 📡 Emit real-time event to ALL for global visibility (Activity Feed/Dashboard)
  socketIO.emitToAll("order_created", order);

  return order;
};

/**
 * Fetch orders, optionally filtered by store_id.
 * Supports pagination and returns the total count for the client.
 *
 * @param {object} options - { store_id, page, limit, search }
 * @returns {Promise<{ orders: Order[], total: number, page: number, totalPages: number }>}
 */
const getOrders = async ({ store_id, page = 1, limit = 10, search = "" }) => {
  const filter = {};

  if (store_id) filter.store_id = store_id;

  // Search across store_id and status fields
  if (search) {
    filter.$or = [
      { store_id: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get a single order by its MongoDB _id.
 * @param {string} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (id) => {
  const order = await Order.findById(id).lean();
  if (!order) throw new ApiError(404, `Order not found: ${id}`);
  return order;
};

/**
 * Update order status with transition validation.
 * Enforces: PLACED → PREPARING → COMPLETED only.
 *
 * @param {string} id     - Order MongoDB _id
 * @param {string} status - Desired new status
 * @returns {Promise<Order>}
 */
/**
 * Permanently delete an order by its MongoDB _id.
 * @param {string} id
 * @returns {Promise<Order>} the deleted document
 */
const deleteOrder = async (id) => {
  const order = await Order.findByIdAndDelete(id);
  if (!order) throw new ApiError(404, `Order not found: ${id}`);
  return order;
};

const updateOrderStatus = async (id, status) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, `Order not found: ${id}`);

  const allowedNext = STATUS_TRANSITIONS[order.status];

  if (!allowedNext.includes(status)) {
    throw new ApiError(
      400,
      `Invalid transition: ${order.status} → ${status}. Allowed: ${allowedNext.join(", ") || "none (terminal state)"}`
    );
  }

  order.status = status;
  await order.save();

  // 📡 Emit real-time status update to the store room AND global activity room
  socketIO.emitToStore(order.store_id, "order_status_updated", {
    orderId: order._id,
    store_id: order.store_id,
    status: order.status,
    updated_at: order.updated_at
  });
  socketIO.emitToStore("global", "order_status_updated", {
    orderId: order._id,
    store_id: order.store_id,
    status: order.status,
    updated_at: order.updated_at
  });

  return order;
};

/**
 * Get aggregate dashboard stats in a single MongoDB aggregation pipeline.
 * Returns status counts, unique store count, total revenue, and recent orders.
 *
 * @returns {Promise<{
 *   total: number,
 *   placed: number,
 *   preparing: number,
 *   completed: number,
 *   stores: number,
 *   revenue: number,
 *   recentOrders: Order[]
 * }>}
 */
const getOrderStats = async (filter = {}) => {
  const [aggResult] = await Order.aggregate([
    { $match: filter }, // Apply store filter if provided
    {
      $facet: {
        statusCounts: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
        revenue: [
          { $group: { _id: null, total: { $sum: "$total_amount" } } },
        ],
        stores: [
          { $group: { _id: "$store_id" } },
          { $count: "count" },
        ],
        recentOrders: [
          { $sort: { created_at: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  // Shape status counts into a flat object
  const statusMap = { PLACED: 0, PREPARING: 0, COMPLETED: 0 };
  (aggResult.statusCounts || []).forEach(({ _id, count }) => {
    if (_id in statusMap) statusMap[_id] = count;
  });

  const total    = Object.values(statusMap).reduce((s, c) => s + c, 0);
  const revenue  = aggResult.revenue?.[0]?.total  ?? 0;
  const stores   = aggResult.stores?.[0]?.count   ?? 0;
  const recentOrders = aggResult.recentOrders || [];

  return {
    total,
    placed:      statusMap.PLACED,
    preparing:   statusMap.PREPARING,
    completed:   statusMap.COMPLETED,
    stores,
    revenue,
    recentOrders,
  };
};

/**
 * Get orders per day (last 30 days)
 */
const getOrdersPerDay = async () => {
  return await Order.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 30 }
  ]);
};

/**
 * Get revenue per store
 */
const getRevenuePerStore = async () => {
  return await Order.aggregate([
    {
      $group: {
        _id: "$store_id",
        revenue: { $sum: "$total_amount" }
      }
    },
    { $sort: { revenue: -1 } }
  ]);
};

/**
 * Get top 5 selling items
 */
const getTopSellingItems = async () => {
  return await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.item_id",
        totalQty: { $sum: "$items.qty" }
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 5 }
  ]);
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  archiveOldOrders,
  getOrdersPerDay,
  getRevenuePerStore,
  getTopSellingItems,
};
