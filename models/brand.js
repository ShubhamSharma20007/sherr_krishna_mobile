const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  brandName: { type: String, required: true },
  image: { type: String},
  isDeleted: { type: Boolean, default: false },
  deletedOn: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date},
});

module.exports = mongoose.model("Brand", brandSchema);
