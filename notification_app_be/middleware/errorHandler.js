const Log = require('logging_middleware');

const errorHandler = async (err, req, res, next) => {
  console.error("Unhandled Error Caught:", err);
  
  // Log fatal error remotely
  await Log("backend", "fatal", "handler", `Global Error: ${err.message}`);
  
  res.status(500).json({
    status: "error",
    message: "Internal Server Error"
  });
};

module.exports = errorHandler;
