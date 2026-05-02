const express = require('express');
const connectDB = require('./config/db');
const vehicleRoutes = require('./routes/vehicle.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

connectDB();

app.use('/', vehicleRoutes);

app.use(errorHandler);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Vehicle Scheduler running on port ${PORT}`);
});
