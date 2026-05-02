const express = require('express');
const mongoose = require('mongoose');
const notificationRoutes = require('./routes/notification.routes');
const Log = require('logging_middleware');

const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/notification_db')
  .then(async () => {
    await Log('backend', 'info', 'db', 'Notification DB connected successfully');
    console.log('Notification DB connected');
  })
  .catch(async (err) => {
    await Log('backend', 'error', 'db', `Notification DB connection failed: ${err.message}`);
    console.error('Notification DB connection error:', err);
  });

app.use('/', notificationRoutes);

app.use(errorHandler);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Notification Backend running on port ${PORT}`);
});
