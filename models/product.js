const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  model: { type: String, required: true },
  description: { type: String },
  images: [{ type: String }],
  isDeleted: { type: Boolean, default: false },
  deletedOn: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date},
});

module.exports = mongoose.model("Product", productSchema);

