import { Request, Response } from 'express';
import { z } from 'zod';
import { botEngine } from '../services/botEngine';
import { otpService } from '../services/otpService';

const orderSchema = z.object({
  uid: z.string().optional(),
  server: z.string().optional(),
  packName: z.string().optional(),
  priceJpy: z.number().positive().optional(),
  autoExecute: z.boolean().optional().default(true),
  mode: z.enum(['simulate', 'playwright']).optional(),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export class TopupController {
  public createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = orderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'invalid_request', details: parsed.error.issues });
        return;
      }

      const order = botEngine.createOrder(parsed.data);

      // Auto-trigger bot if requested
      if (parsed.data.autoExecute) {
        // Run in background and respond with order created
        botEngine.executeOrder(order.id).catch((err) => {
          console.warn(`[Background Order ${order.id} Execution Notice]: ${err.message}`);
        });
      }

      res.status(201).json({
        success: true,
        message: 'Order created and queued for automated bot execution',
        data: order,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  public executeOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = botEngine.getOrder(id);
      if (!order) {
        res.status(404).json({ success: false, error: 'order_not_found' });
        return;
      }

      // Execute asynchronously or await
      const executed = await botEngine.executeOrder(id);
      res.status(200).json({ success: true, data: executed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  public getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const order = botEngine.getOrder(id);
      if (!order) {
        res.status(404).json({ success: false, error: 'order_not_found' });
        return;
      }
      res.status(200).json({ success: true, data: order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public getOrders = async (_req: Request, res: Response): Promise<void> => {
    try {
      const orders = botEngine.getAllOrders();
      res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public submitOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const parsed = otpSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'invalid_otp_format', message: 'OTP must be 6 digits' });
        return;
      }

      const submitted = otpService.submitManualOtp(id, parsed.data.otp);
      res.status(200).json({
        success: true,
        message: submitted ? `OTP accepted for Order #${id}` : 'OTP stored as last known code',
        orderId: id,
        otp: parsed.data.otp,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  public getBotStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = botEngine.getStatus();
      const waitingOrders = otpService.getPendingOrdersWaitingForOtp();
      res.status(200).json({
        success: true,
        data: {
          ...status,
          waitingForOtp: waitingOrders.length > 0,
          pendingOtpOrders: waitingOrders,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

export const topupController = new TopupController();
