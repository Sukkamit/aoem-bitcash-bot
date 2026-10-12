import express from 'express';
import path from 'path';
import { topupController } from './controllers/topupController';
import { balanceController } from './controllers/balanceController';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard & receipts
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use('/receipts', express.static(path.join(process.cwd(), 'public', 'receipts')));

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'aoem-bitcash-bot',
    game: 'Age of Empires Mobile (Japan Region)',
    paymentChannel: 'BitCash (MyBitCash)',
    timestamp: new Date().toISOString(),
  });
});

// Top-up Order Routes
app.post('/api/v1/topup/orders', topupController.createOrder);
app.get('/api/v1/topup/orders', topupController.getOrders);
app.get('/api/v1/topup/orders/:id', topupController.getOrder);
app.post('/api/v1/topup/orders/:id/execute', topupController.executeOrder);
app.post('/api/v1/topup/orders/:id/otp', topupController.submitOtp);
app.post('/api/v1/otp/submit', topupController.submitOtp);
app.get('/api/v1/bot/status', topupController.getBotStatus);

// BitCash Balance Routes
app.get('/api/v1/bitcash/balance', balanceController.getBalance);
app.post('/api/v1/bitcash/balance/check', balanceController.checkDirectBalance);
app.get('/api/v1/bitcash/balance/history', balanceController.getHistory);

// Single Page Dashboard Fallback
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
