import express from 'express';
import path from 'path';
import { topupController } from './controllers/topupController';
import { balanceController } from './controllers/balanceController';

import fs from 'fs';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend dashboard
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Serve receipts with dynamic SVG & HTML preview to prevent broken image icons
app.get('/receipts/:filename', (req, res) => {
  const filename = req.params.filename;
  const receiptsDir = path.join(process.cwd(), 'public', 'receipts');
  const filePath = path.join(receiptsDir, filename);
  const svgPath = filePath.replace(/\.png$/i, '.svg');

  const targetPath = fs.existsSync(svgPath) ? svgPath : filePath;
  if (!fs.existsSync(targetPath)) {
    return res.status(404).send('Receipt not found');
  }

  const content = fs.readFileSync(targetPath, 'utf8');

  // If user opens directly in a browser tab (Accept text/html), render a sleek preview card
  if (req.headers.accept?.includes('text/html')) {
    let previewHtml = '';
    const isSvg = targetPath.endsWith('.svg');

    if (isSvg) {
      const svgText = fs.readFileSync(targetPath, 'utf8');
      previewHtml = `<div class="svg-wrapper">${svgText}</div>`;
    } else {
      const imgBuffer = fs.readFileSync(targetPath);
      const base64Img = imgBuffer.toString('base64');
      previewHtml = `
        <div style="background:#fff; border-radius:12px; overflow:hidden; max-height:75vh; overflow-y:auto; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <img src="data:image/png;base64,${base64Img}" alt="Receipt Screenshot" style="width:100%; height:auto; display:block;" />
        </div>
      `;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>電子レシート - ${filename}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0b0f19;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 16px;
            box-sizing: border-box;
          }
          .card {
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 14px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            padding: 18px 20px;
            max-width: 720px;
            max-height: 94vh;
            overflow-y: auto;
            width: 100%;
            text-align: center;
          }
          .header {
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1f2937;
            padding-bottom: 12px;
          }
          .title { font-size: 1.1rem; font-weight: 600; color: #38bdf8; }
          .badge { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
          .svg-wrapper {
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
          }
          .svg-wrapper svg {
            width: 100%;
            height: auto;
            display: block;
          }
          .actions {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            gap: 12px;
          }
          .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            text-decoration: none;
            font-weight: 500;
          }
          .btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="title">🧾 Midasbuy & BitCash 決済完了レシート</span>
            <span class="badge">ชำระเงินสำเร็จ</span>
          </div>
          ${previewHtml}
          <div class="actions">
            <button class="btn" onclick="window.print()">พิมพ์ / บันทึกเอกสาร</button>
            <button class="btn" style="background:#475569;" onclick="window.close()">ปิดหน้านี้</button>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  // Otherwise, return direct binary or SVG
  if (targetPath.endsWith('.png')) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(targetPath);
  }
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.sendFile(targetPath);
});

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
