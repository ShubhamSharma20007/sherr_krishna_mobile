const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true},
  password: { type: String, required: true},
  isAdmin: { type: String, default: "0" },
  otp: { type: String},
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);

