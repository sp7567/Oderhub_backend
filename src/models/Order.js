/**
 * models/Order.js — Mongoose schema for an Order document.
 *
 * Schema:
 *   store_id     — The store that placed the order (indexed for fast lookups)
 *   items        — Array of { item_id, qty } sub-documents
 *   total_amount — Total price in the smallest currency unit (e.g., paise / cents)
 *   status       — Lifecycle: PLACED → PREPARING → COMPLETED
 *   created_at   — Auto-managed by Mongoose timestamps option
 */

const mongoose = require("mongoose");

// ─── Item Sub-Schema ──────────────────────────────────────────────────────────

const ItemSchema = new mongoose.Schema(
  {
    item_id: {
      type: String,
      required: [true, "item_id is required"],
      trim: true,
    },
    qty: {
      type: Number,
      required: [true, "qty is required"],
      min: [1, "qty must be at least 1"],
    },
  },
  { _id: false } // No separate _id for each item sub-document
);

// ─── Order Schema ─────────────────────────────────────────────────────────────

const OrderSchema = new mongoose.Schema(
  {
    store_id: {
      type: String,
      required: [true, "store_id is required"],
      trim: true,
      index: true, // Index for efficient store-wise queries
    },
    items: {
      type: [ItemSchema],
      validate: {
        validator: (val) => Array.isArray(val) && val.length > 0,
        message: "Order must contain at least one item",
      },
    },
    total_amount: {
      type: Number,
      required: [true, "total_amount is required"],
      min: [0, "total_amount cannot be negative"],
    },
    status: {
      type: String,
      enum: {
        values: ["PLACED", "PREPARING", "COMPLETED"],
        message: "{VALUE} is not a valid status",
      },
      default: "PLACED",
    },
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound index: sort store orders by latest first efficiently
OrderSchema.index({ store_id: 1, created_at: -1 });
OrderSchema.index({ created_at: -1 }); // For global latest-first sorts

// ─── Virtual: expose id as string ────────────────────────────────────────────

OrderSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Order", OrderSchema);
