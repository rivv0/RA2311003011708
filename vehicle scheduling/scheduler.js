const axios = require('axios');
const { getToken } = require('../logging_middleware/auth');
const { BASE_URL } = require('../logging_middleware/config');

async function getDepots(token) {
  const res = await axios.get(`${BASE_URL}/depots`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.depots;
}

async function getVehicles(token) {
  const res = await axios.get(`${BASE_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.vehicles;
}

async function runScheduler() {
  try {
    const token = await getToken();
    if (!token) throw new Error("Failed to get auth token");

    const depots = await getDepots(token);
    const vehicles = await getVehicles(token);

    console.log(`Fetched ${depots.length} depots and ${vehicles.length} vehicles.`);

    // Calculate total mechanic hours
    const totalBudget = depots.reduce((sum, depot) => sum + depot.MechanicHours, 0);
    console.log(`Total Mechanic Hours Budget: ${totalBudget}`);


    // We want to maximize total Impact, given total Duration <= totalBudget so we use Knapsack 0/1 algorithm


    const n = vehicles.length;
    // DP array
    const dp = Array(totalBudget + 1).fill(0);
    // Keep track of chosen items for reconstruction
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

    let res = dp[totalBudget];
    let w = totalBudget;
    const selectedVehicles = [];

    for (let i = n; i > 0; i--) {
      if (keep[i][w]) {
        selectedVehicles.push(vehicles[i - 1]);
        w -= vehicles[i - 1].Duration;
      }
    }

    console.log(`Maximized Impact: ${res}`);
    console.log(`Selected ${selectedVehicles.length} vehicles to service.`);

    let totalUsedDuration = 0;
    let totalAchievedImpact = 0;
    console.log("\n How it works");
    selectedVehicles.forEach((v, index) => {
      console.log(`Task ${index + 1}: ID ${v.TaskID} | Duration: ${v.Duration} | Impact: ${v.Impact}`);
      totalUsedDuration += v.Duration;
      totalAchievedImpact += v.Impact;
    });

    console.log(`Total Duration Used: ${totalUsedDuration} (Must be <= ${totalBudget})`);
    console.log(`Total Impact Achieved: ${totalAchievedImpact} (Must equal ${res})`);

    console.log("\nSelected Vehicle TaskIDs:", selectedVehicles.map(v => v.TaskID));

  } catch (err) {
    console.error("Scheduler failed:", err.message);
  }
}

runScheduler();
