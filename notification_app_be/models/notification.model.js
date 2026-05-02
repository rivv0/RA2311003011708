const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: String,
  message: String,
  type: String
});

module.exports = mongoose.model("Notification", schema);
