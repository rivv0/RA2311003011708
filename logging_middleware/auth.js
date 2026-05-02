const axios = require("axios");
const { BASE_URL, credentials } = require("./config");

let token = null;
let tokenExpiry = null;

async function getToken() {
  // if token is about to expire (within 60s), just clear it now
  // saves us from making a request that'll 401 anyway
  if (token && tokenExpiry && Date.now() >= tokenExpiry - 60000) {
    token = null;
  }

  if (token) return token;

  try {
    const res = await axios.post(`${BASE_URL}/auth`, credentials);
    token = res.data.access_token;
    
    // Decode JWT to extract expiration time
    const payloadBase64 = token.split('.')[1];
    if (payloadBase64) {
      const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
      if (decoded.exp) {
        tokenExpiry = decoded.exp * 1000; // Convert Unix timestamp to milliseconds
      }
    }
    
    return token;
  } catch (err) {
    console.error("Auth failed", err.message);
    return null;
  }
}

function clearToken() {
  token = null;
}

module.exports = { getToken, clearToken };
