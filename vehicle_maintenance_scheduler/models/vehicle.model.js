const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: String,
  type: String,
  lastServiceDate: Date
});

module.exports = mongoose.model("Vehicle", schema);
