const mongoose = require("mongoose");

const productPartsSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId,ref:'Product', required: true }, 
  partName: { type: String, required: true },
  category: { type: String, required: true },
  compatibleWith: [{type: mongoose.Schema.Types.ObjectId, ref: 'Product'}],
  description: { type: String, required: true },
  images : [{ type: String}],
  isDeleted: { type: Boolean, default: false },
  deletedOn: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date},
});

module.exports = mongoose.model("ProductParts", productPartsSchema);

