import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import TransactionNotificationHandler from './handlers/TransactionNotification.handler';
import PayoutNotificationHandler from './handlers/PayoutNotification.handler';

const app = express();

const transactionNotificationHandler = new TransactionNotificationHandler();
const payoutNotificationHandler = new PayoutNotificationHandler();

app.use(bodyParser.json());

app.post('/transaction', async (req, res) => {
  try {
    await transactionNotificationHandler.receiveTransactionNotification(req);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/payout', async (req, res) => {
  try {
    await payoutNotificationHandler.receivePayoutNotification(req);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  wtimeout: 120000,
}as any).then(() => {
  console.log('Connected to MongoDB');
  app.listen(3000, () => {
    console.log('Server listening on port 3000');
  });
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

export default app;