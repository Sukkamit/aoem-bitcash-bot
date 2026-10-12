import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3003', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Midasbuy Credentials
  MIDASBUY: {
    EMAIL: process.env.MIDASBUY_EMAIL || 'Botfordevinblack@hotmail.com',
    PASSWORD: process.env.MIDASBUY_PASSWORD || 'testdev123',
    REGION: 'jp',
    BASE_URL: 'https://www.midasbuy.com',
    SHOP_URL: 'https://www.midasbuy.com/midasbuy/jp/shop/aoem?from=self_midasbuy_saas#!/pages/shop/items',
    BUY_URL: 'https://www.midasbuy.com/midasbuy/jp/buy/aoem',
    DEFAULT_UID: '5250140737488366145',
    DEFAULT_SERVER: 'Empire#239',
    TARGET_PACK: '99+109 Coin',
    TARGET_PRICE_JPY: 146,
  },

  // BitCash Credentials
  BITCASH: {
    MEMBER_ID: process.env.BITCASH_MEMBER_ID || 'Inblackm7',
    PASSWORD: process.env.BITCASH_PASSWORD || 'kanomtandede@7',
    PORTAL_URL: 'https://bitcash.jp',
    LOGIN_URL: 'https://bitcash.jp/login',
  },

  // Hotmail / Outlook OTP Email Credentials
  EMAIL_OTP: {
    EMAIL: process.env.EMAIL_OTP_USER || 'Inblackbitcash7g@hotmail.com',
    PASSWORD: process.env.EMAIL_OTP_PASSWORD || 'Tishaluna123',
    IMAP_HOST: process.env.IMAP_HOST || 'outlook.office365.com',
    IMAP_PORT: parseInt(process.env.IMAP_PORT || '993', 10),
    IMAP_SECURE: true,
  },

  // Bot Engine Options
  BOT: {
    HEADLESS: process.env.BOT_HEADLESS !== 'false',
    TIMEOUT_MS: parseInt(process.env.BOT_TIMEOUT_MS || '60000', 10),
    OTP_WAIT_TIMEOUT_MS: parseInt(process.env.OTP_WAIT_TIMEOUT_MS || '120000', 10),
    SIMULATE_MODE: process.env.SIMULATE_MODE === 'true',
    SCREENSHOT_DIR: process.env.SCREENSHOT_DIR || 'public/receipts',
  },
};
