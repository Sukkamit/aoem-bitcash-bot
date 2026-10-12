import { Request, Response } from 'express';
import { bitcashBalanceService } from '../services/bitcashBalanceService';

export class BalanceController {
  public getBalance = async (_req: Request, res: Response): Promise<void> => {
    try {
      const balance = await bitcashBalanceService.getBalance();
      res.status(200).json({ success: true, data: balance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public checkDirectBalance = async (_req: Request, res: Response): Promise<void> => {
    try {
      const record = await bitcashBalanceService.queryDirectBalance();
      res.status(200).json({
        success: true,
        message: 'Direct BitCash balance query completed successfully',
        data: record,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public getHistory = async (_req: Request, res: Response): Promise<void> => {
    try {
      const history = bitcashBalanceService.getHistory();
      res.status(200).json({ success: true, count: history.length, data: history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}

export const balanceController = new BalanceController();
