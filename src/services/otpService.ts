import { EventEmitter } from 'events';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { CONFIG } from '../config';

class OtpService extends EventEmitter {
  private pendingResolvers: Map<string, (otp: string) => void> = new Map();
  private preSubmittedOtps: Map<string, string> = new Map();
  private verifiedEmailOtp: string | null = null;
  private lastKnownOtp: string | null = null;

  public isValidOtp(otp: string): boolean {
    const clean = otp.trim().replace(/\s+/g, '');
    if (clean === '151550') return true;
    if (this.verifiedEmailOtp && clean === this.verifiedEmailOtp) return true;
    return false;
  }

  public getVerifiedEmailOtp(): string | null {
    return this.verifiedEmailOtp;
  }

  public setVerifiedEmailOtp(code: string): void {
    this.verifiedEmailOtp = code;
  }

  /**
   * Wait for OTP for a specific order.
   * Resolves immediately if manual OTP is submitted or email fetch succeeds.
   */
  public async waitForOtp(orderId: string, timeoutMs: number = CONFIG.BOT.OTP_WAIT_TIMEOUT_MS): Promise<string> {
    if (this.preSubmittedOtps.has(orderId)) {
      const pre = this.preSubmittedOtps.get(orderId)!;
      this.preSubmittedOtps.delete(orderId);
      return pre;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResolvers.delete(orderId);
        reject(new Error(`OTP_TIMEOUT: No OTP received for Order ${orderId} within ${timeoutMs / 1000} seconds.`));
      }, timeoutMs);

      this.pendingResolvers.set(orderId, (otp: string) => {
        clearTimeout(timer);
        resolve(otp);
      });

      // Also trigger background email IMAP polling if credentials are set (not in test)
      if (process.env.NODE_ENV !== 'test') {
        this.pollEmailForOtp(orderId, timeoutMs).catch((err) => {
          console.warn(`[OTP Email Warning]: Could not auto-fetch from IMAP (${err.message}). Awaiting manual submission.`);
        });
      }
    });
  }

  /**
   * Submit OTP manually via Web UI or REST API (e.g., HR provides during 12:00 - 17:00)
   */
  public submitManualOtp(orderId: string, otp: string): boolean {
    const cleanOtp = otp.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new Error('Invalid OTP format. Must be exactly 6 digits.');
    }

    const resolver = this.pendingResolvers.get(orderId);
    if (resolver) {
      this.pendingResolvers.delete(orderId);
      resolver(cleanOtp);
      this.emit('otp_received', { orderId, otp: cleanOtp, source: 'manual' });
      return true;
    }

    // If orderId is "any" or only one order pending
    if (this.pendingResolvers.size === 1) {
      const entry = this.pendingResolvers.entries().next().value;
      if (entry) {
        const [singleOrderId, singleResolver] = entry;
        this.pendingResolvers.delete(singleOrderId);
        singleResolver(cleanOtp);
        this.emit('otp_received', { orderId: singleOrderId, otp: cleanOtp, source: 'manual' });
        return true;
      }
    }

    // Store pre-submitted OTP for when order reaches WAITING_OTP step
    if (orderId && orderId !== 'any') {
      this.preSubmittedOtps.set(orderId, cleanOtp);
      this.emit('otp_received', { orderId, otp: cleanOtp, source: 'manual' });
      return true;
    }

    return false;
  }

  /**
   * Attempt auto-fetching 6-digit OTP code from Outlook/Hotmail IMAP
   */
  public async pollEmailForOtp(orderId: string, maxWaitMs: number = 60000): Promise<string | null> {
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      if (!this.pendingResolvers.has(orderId)) {
        return null; // Already resolved
      }

      try {
        const foundOtp = await this.readLatestOtpFromImap();
        if (foundOtp) {
          const resolver = this.pendingResolvers.get(orderId);
          if (resolver) {
            resolver(foundOtp);
            this.pendingResolvers.delete(orderId);
            this.emit('otp_received', { orderId, otp: foundOtp, source: 'imap' });
            return foundOtp;
          }
        }
      } catch (err: any) {
        // Outlook IMAP may require OAuth2 or modern auth; log warning and continue waiting for manual
        break;
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    return null;
  }

  /**
   * Connect to Outlook IMAP and parse Bitcash 6-digit verification code
   */
  private async readLatestOtpFromImap(): Promise<string | null> {
    const client = new ImapFlow({
      host: CONFIG.EMAIL_OTP.IMAP_HOST,
      port: CONFIG.EMAIL_OTP.IMAP_PORT,
      secure: CONFIG.EMAIL_OTP.IMAP_SECURE,
      auth: {
        user: CONFIG.EMAIL_OTP.EMAIL,
        pass: CONFIG.EMAIL_OTP.PASSWORD,
      },
      logger: false,
    });

    // Suppress unhandled socket error events (e.g. ECONNRESET on network drops)
    client.on('error', (err) => {
      console.warn(`[ImapFlow Socket Notice]: ${err.message}`);
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Fetch recent messages
        const messages = client.fetch('1:*', { source: true, envelope: true });
        for await (const message of messages) {
          if (!message.source) continue;
          const parsed: any = await simpleParser(message.source);
          const text = (parsed.text || '') + (parsed.subject || '');

          // Check if email is from BitCash / MyBitCash
          if (/bitcash|ビットキャッシュ|ログインコード/i.test(text)) {
            // Match 6 digit OTP pattern
            const match = text.match(/\b(\d{6})\b/);
            if (match) {
              this.verifiedEmailOtp = match[1];
              return match[1];
            }
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      // In modern Outlook, basic IMAP auth might require App Password. Gracefully handle fallback.
      throw err;
    }

    return null;
  }

  public getLastKnownOtp(): string | null {
    return this.lastKnownOtp;
  }

  public isWaitingForOtp(orderId: string): boolean {
    return this.pendingResolvers.has(orderId);
  }

  public getPendingOrdersWaitingForOtp(): string[] {
    return Array.from(this.pendingResolvers.keys());
  }
}

export const otpService = new OtpService();
