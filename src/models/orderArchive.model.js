const mongoose = require("mongoose");

/**
 * src/models/orderArchive.model.js
 * Schema for archived orders. Identical to Order schema to ensure data compatibility.
 */
const orderArchiveSchema = new mongoose.Schema(
  {
    store_id: { type: String, required: true, index: true },
    items: [
      {
        item_id: String,
        qty: Number,
        price: Number,
      },
    ],
    total_amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PLACED", "PREPARING", "COMPLETED", "CANCELLED"],
      default: "PLACED",
    },
    archived_at: { type: Date, default: Date.now },
    original_created_at: { type: Date },
  },
  {
    timestamps: false, // We use original timestamps
    versionKey: false,
  }
);

module.exports = mongoose.model("OrderArchive", orderArchiveSchema, "orders_archive");
