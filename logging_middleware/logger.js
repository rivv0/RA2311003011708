const axios = require("axios");
const { BASE_URL } = require("./config");
const { getToken, clearToken } = require("./auth");

const validLevels = ["debug", "info", "warn", "error", "fatal"];
const validPackages = [
  "cache", "controller", "cron_job", "db", 
  "domain", "handler", "repository", "route", "service"
];

async function sendLog(token, stack, level, pkg, message) {
  await axios.post(
    `${BASE_URL}/logs`,
    { stack, level, package: pkg, message },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

async function Log(stack, level, pkg, message) {
  try {
    if (stack !== "backend" || !validLevels.includes(level) || !validPackages.includes(pkg)) return;

    let token = await getToken();
    if (!token) return;

    try {
      await sendLog(token, stack, level, pkg, message);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        clearToken();
        token = await getToken();
        if (token) {
          await sendLog(token, stack, level, pkg, message);
        }
      }
    }
  } catch (err) {
    // fail silently (important)
  }
}

module.exports = Log;
