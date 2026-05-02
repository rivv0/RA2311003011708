const Notification = require("../models/notification.model");
const Log = require("logging_middleware");

exports.sendNotification = async (req, res) => {
  try {
    const data = await Notification.create(req.body);
    await Log("backend", "info", "service", "Notification sent");
    res.status(201).json(data);
  } catch (err) {
    await Log("backend", "error", "service", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const data = await Notification.find();
    await Log("backend", "info", "service", "Fetched notifications");
    res.status(200).json(data);
  } catch (err) {
    await Log("backend", "error", "service", err.message);
    res.status(500).json({ error: err.message });
  }
};
