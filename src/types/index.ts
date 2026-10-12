export type BotOrderStatus =
  | 'PENDING'
  | 'INITIALIZING'
  | 'LOGGING_IN_MIDASBUY'
  | 'SELECTING_PACKAGE'
  | 'REDIRECTING_BITCASH'
  | 'LOGGING_IN_MYBITCASH'
  | 'WAITING_OTP'
  | 'SUBMITTING_OTP'
  | 'PAYMENT_COMPLETED'
  | 'RECEIPT_CAPTURED'
  | 'FAILED'
  | 'CANCELLED';

export interface TopupOrderRequest {
  uid?: string;
  server?: string;
  packName?: string;
  priceJpy?: number;
  autoOtp?: boolean;
  mode?: 'simulate' | 'playwright';
}

export interface ReceiptInfo {
  invoiceNo: string; // 請求番号
  transactionNo: string; // トランザクション番号
  timestamp: string; // 受付日時
  paidAmountCredits: number; // お支払い額
  remainingBalanceCredits: number; // マイビットキャッシュ残高
  screenshotFilename: string;
  screenshotUrl: string;
}

export interface TopupOrder {
  id: string;
  uid: string;
  server: string;
  packName: string;
  priceJpy: number;
  status: BotOrderStatus;
  stepDescription: string;
  mode?: 'simulate' | 'playwright';
  receipt?: ReceiptInfo;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BitcashBalanceRecord {
  id: string;
  timestamp: string;
  balanceCredits: number;
  changeAmount?: number;
  reason: 'TOPUP_DEDUCTION' | 'DIRECT_CHECK' | 'INITIAL_READ';
  referenceInvoice?: string;
}

export interface OtpSubmissionPayload {
  orderId: string;
  otpCode: string;
}
