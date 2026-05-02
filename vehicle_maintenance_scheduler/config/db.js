const mongoose = require('mongoose');
const Log = require('logging_middleware');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vehicle_scheduler');
    await Log('backend', 'info', 'db', 'MongoDB connected successfully');
    console.log('MongoDB connected');
  } catch (err) {
    await Log('backend', 'error', 'db', `MongoDB connection failed: ${err.message}`);
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
