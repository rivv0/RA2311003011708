const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");
const Log = require("logging_middleware");

router.use(async (req, res, next) => {
  await Log("backend", "info", "route", `Received ${req.method} request on ${req.originalUrl}`);
  next();
});

router.post("/notify", controller.sendNotification);
router.get("/notifications", controller.getNotifications);

module.exports = router;
