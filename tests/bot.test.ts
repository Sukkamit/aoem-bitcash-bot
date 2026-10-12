import request from 'supertest';
import { app } from '../src/app';
import { botEngine } from '../src/services/botEngine';
import { bitcashBalanceService } from '../src/services/bitcashBalanceService';
import { otpService } from '../src/services/otpService';
import { CONFIG } from '../src/config';

describe('Age of Empires Mobile - Bitcash Top-Up Bot & Balance Checker Suite', () => {
  beforeAll(() => {
    // Force simulation driver during test execution for deterministic assertion
    CONFIG.BOT.SIMULATE_MODE = true;
  });

  describe('1. Health Check & Environment Verification', () => {
    it('GET /health should return 200 and correct game configuration', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.game).toContain('Age of Empires Mobile');
      expect(res.body.paymentChannel).toContain('BitCash');
    });
  });

  describe('2. Safety Guard & Package Protection', () => {
    it('Should reject expensive packs > 146 JPY to avoid losing test money', async () => {
      const res = await request(app)
        .post('/api/v1/topup/orders')
        .send({
          packName: '9200 Coin',
          priceJpy: 10000,
          autoExecute: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('SAFETY_LOCK');
    });

    it('Should accept Pack 99+109 Coin (146 JPY)', async () => {
      const res = await request(app)
        .post('/api/v1/topup/orders')
        .send({
          uid: '5250140737488366145',
          server: 'Empire#239',
          packName: '99+109 Coin',
          priceJpy: 146,
          autoExecute: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priceJpy).toBe(146);
      expect(res.body.data.uid).toBe('5250140737488366145');
    });
  });

  describe('3. Automated Bot Execution & Receipt Capture', () => {
    let orderId: string;

    it('Should create an order and start automated execution', async () => {
      const res = await request(app)
        .post('/api/v1/topup/orders')
        .send({ autoExecute: false });

      expect(res.status).toBe(201);
      orderId = res.body.data.id;
      expect(res.body.data.status).toBe('PENDING');
    });

    it('Should execute complete 6-step flow and capture receipt with remaining balance', async () => {
      const res = await request(app).post(`/api/v1/topup/orders/${orderId}/execute`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const order = res.body.data;
      expect(order.status).toBe('RECEIPT_CAPTURED');
      expect(order.receipt).toBeDefined();

      // Verify Receipt Details
      expect(order.receipt.invoiceNo).toMatch(/^INV\d+/);
      expect(order.receipt.paidAmountCredits).toBe(146);
      expect(order.receipt.remainingBalanceCredits).toBeGreaterThan(0);
      expect(order.receipt.screenshotFilename).toContain('.png');
      expect(order.receipt.screenshotUrl).toContain('/receipts/');
    });

    it('GET /api/v1/topup/orders/:id should retrieve completed order details', async () => {
      const res = await request(app).get(`/api/v1/topup/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderId);
      expect(res.body.data.receipt).toBeDefined();
    });
  });

  describe('4. OTP Validation & Handling', () => {
    it('Should reject invalid OTP format', async () => {
      const res = await request(app)
        .post('/api/v1/otp/submit')
        .send({ otp: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Should accept valid 6-digit OTP code', async () => {
      const res = await request(app)
        .post('/api/v1/otp/submit')
        .send({ otp: '151550' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.otp).toBe('151550');
    });

    it('Should strictly fail order and NOT generate receipt when incorrect OTP (111111) is provided', async () => {
      const createRes = await request(app)
        .post('/api/v1/topup/orders')
        .send({
          uid: '5250140737488366145',
          server: 'Empire#239',
          autoExecute: false,
          mode: 'simulate',
        });
      const wrongOrderId = createRes.body.data.id;

      // Pre-submit wrong OTP '111111'
      const otpRes = await request(app)
        .post(`/api/v1/topup/orders/${wrongOrderId}/otp`)
        .send({ otp: '111111' });
      expect(otpRes.status).toBe(200);

      // Execute order (which reads the pre-submitted OTP and fails)
      const execRes = await request(app).post(`/api/v1/topup/orders/${wrongOrderId}/execute`);
      expect(execRes.status).toBe(400);
      expect(execRes.body.success).toBe(false);
      expect(execRes.body.error).toContain('INVALID_OTP');

      // Check order state: status must be FAILED and receipt must NOT exist
      const checkRes = await request(app).get(`/api/v1/topup/orders/${wrongOrderId}`);
      expect(checkRes.body.data.status).toBe('FAILED');
      expect(checkRes.body.data.receipt).toBeUndefined();
    });
  });

  describe('5. BitCash Balance & Transaction Ledger', () => {
    it('GET /api/v1/bitcash/balance should return current balance', async () => {
      const res = await request(app).get('/api/v1/bitcash/balance');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('balanceCredits');
      expect(res.body.data.memberId).toBe('Inblackm7');
    });

    it('POST /api/v1/bitcash/balance/check should query direct balance', async () => {
      const res = await request(app).post('/api/v1/bitcash/balance/check');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reason).toBe('DIRECT_CHECK');
    });

    it('GET /api/v1/bitcash/balance/history should return transaction ledger', async () => {
      const res = await request(app).get('/api/v1/bitcash/balance/history');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
