const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' , required: true},
  productPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductParts', required: true },
  stockType: {type: String,enum: ['In', 'Out'],required: true},
  qty: {type: Number,required: true,min: 1},
  remark: {type: String},
  isDeleted: { type: Boolean, default: false },
  deletedOn: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date},
});

module.exports = mongoose.model("stockLedger", stockLedgerSchema);



