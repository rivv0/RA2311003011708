const express = require("express");
const router = express.Router();
const controller = require("../controllers/vehicle.controller");
const Log = require("logging_middleware");

router.use(async (req, res, next) => {
  await Log("backend", "info", "route", `Received ${req.method} request on ${req.originalUrl}`);
  next();
});

router.post("/vehicles", controller.addVehicle);
router.get("/vehicles", controller.getVehicles);
router.delete("/vehicles/:id", controller.deleteVehicle);
router.post("/services", controller.scheduleService);
router.get("/services", controller.getSchedules);
router.get("/services/optimize", controller.optimizeSchedule);

module.exports = router;
