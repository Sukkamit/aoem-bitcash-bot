import http from 'http';
import dotenv from 'dotenv';
import { app } from './app';
import { wsManager } from './ws/websocketServer';
import { CONFIG } from './config';
import { bitcashBalanceService } from './services/bitcashBalanceService';

dotenv.config();

const PORT = CONFIG.PORT;
const server = http.createServer(app);

// Mount real-time WebSocket server
wsManager.init(server);

server.listen(PORT, async () => {
  const balance = await bitcashBalanceService.getBalance();
  console.log('========================================================================');
  console.log('🛡️  AOEM BitCash Automated Top-up Bot & Balance Checker Started');
  console.log(`🌐 Web Dashboard & API : http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Stream     : ws://localhost:${PORT}/ws`);
  console.log(`💰 Current BitCash Fund : ${balance.formattedBalance}`);
  console.log(`🎮 Target Game & Region : Age of Empires Mobile (Midasbuy Japan)`);
  console.log(`👤 Target Test UID      : ${CONFIG.MIDASBUY.DEFAULT_UID} (${CONFIG.MIDASBUY.DEFAULT_SERVER})`);
  console.log(`📦 Locked Test Pack     : ${CONFIG.MIDASBUY.TARGET_PACK} (${CONFIG.MIDASBUY.TARGET_PRICE_JPY} JPY)`);
  console.log('========================================================================');
});
