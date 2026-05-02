const Vehicle = require("../models/vehicle.model");
const Service = require("../models/service.model");
const Log = require("logging_middleware");

exports.addVehicle = async (req, res) => {
  try {
    const data = await Vehicle.create(req.body);
    await Log("backend", "info", "controller", "Vehicle created");
    res.status(201).json(data);
  } catch (err) {
    await Log("backend", "error", "controller", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    const data = await Vehicle.find();
    await Log("backend", "info", "controller", "Fetched vehicles");
    res.status(200).json(data);
  } catch (err) {
    await Log("backend", "error", "controller", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const data = await Vehicle.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ error: "Vehicle not found" });
    await Log("backend", "info", "controller", "Vehicle deleted");
    res.status(200).json({ message: "Vehicle deleted" });
  } catch (err) {
    await Log("backend", "error", "controller", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.scheduleService = async (req, res) => {
  try {
    const data = await Service.create(req.body);
    await Log("backend", "info", "controller", "Service scheduled");
    res.status(201).json(data);
  } catch (err) {
    await Log("backend", "error", "controller", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const data = await Service.find();
    await Log("backend", "info", "controller", "Fetched service schedules");
    res.status(200).json(data);
  } catch (err) {
    await Log("backend", "error", "controller", err.message);
    res.status(500).json({ error: err.message });
  }
};

const axios = require('axios');
const { getToken } = require('logging_middleware/auth');
const { BASE_URL } = require('logging_middleware/config');

exports.optimizeSchedule = async (req, res, next) => {
  try {
    const token = await getToken();
    if (!token) throw new Error("Failed to get auth token");

    const [depotsRes, vehiclesRes] = await Promise.all([
      axios.get(`${BASE_URL}/depots`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${BASE_URL}/vehicles`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const depots = depotsRes.data.depots;
    const vehicles = vehiclesRes.data.vehicles;

    const totalBudget = depots.reduce((sum, depot) => sum + depot.MechanicHours, 0);
    const n = vehicles.length;
    
    const dp = Array(totalBudget + 1).fill(0);
    const keep = Array.from({ length: n + 1 }, () => Array(totalBudget + 1).fill(false));

    for (let i = 1; i <= n; i++) {
      const v = vehicles[i - 1];
      const duration = v.Duration;
      const impact = v.Impact;

      for (let w = totalBudget; w >= 0; w--) {
        if (duration <= w) {
          if (dp[w - duration] + impact > dp[w]) {
            dp[w] = dp[w - duration] + impact;
            keep[i][w] = true;
          }
        }
      }
    }

    let resBudget = totalBudget;
    const selectedVehicles = [];

    for (let i = n; i > 0; i--) {
      if (keep[i][resBudget]) {
        selectedVehicles.push(vehicles[i - 1]);
        resBudget -= vehicles[i - 1].Duration;
      }
    }

    const totalUsedDuration = selectedVehicles.reduce((sum, v) => sum + v.Duration, 0);
    const totalAchievedImpact = selectedVehicles.reduce((sum, v) => sum + v.Impact, 0);

    await Log("backend", "info", "service", `Optimized schedule with max impact: ${dp[totalBudget]}`);
    res.status(200).json({
      totalBudget,
      maxImpact: dp[totalBudget],
      totalUsedDuration,
      totalAchievedImpact,
      selectedTaskIDs: selectedVehicles.map(v => v.TaskID)
    });

  } catch (err) {
    next(err);
  }
};
