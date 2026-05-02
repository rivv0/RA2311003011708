const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  vehicleId: { type: String, index: true }, // queried a lot, index helps
  serviceDate: { type: Date, index: true }, // for date range queries
  description: String
});

module.exports = mongoose.model("Service", schema);
