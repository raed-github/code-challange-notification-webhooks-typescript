import { Request } from 'express';
import mongoose from 'mongoose';
import { Transaction, TransactionModel } from '../models/transaction.model';
import { Payout, PayoutModel } from '../models/payout.model';

interface PayoutNotificationData {
  date: Date;
  transactionId: string;
  merchantId: string;
  payoutId: string;
  splits: {
    id: string;
    type: 'merchant' | 'fixedFee' | 'variableFee';
    amount: number;
  }[];
}

class PayoutNotificationHandler {
  private payoutModel: mongoose.Model<Payout>;
  private transactionModel: mongoose.Model<Transaction>;

  constructor() {
    this.payoutModel = PayoutModel.getModel();
    this.transactionModel = TransactionModel.getModel();
  }

  public async receivePayoutNotification(req: Request): Promise<void> {
    const data: PayoutNotificationData = req.body;

    const payouts = await this.calculatePayoutSplits(data);
    await this.createPayoutRecord(data, payouts);
  }

  public async calculatePayoutSplits(data: PayoutNotificationData): Promise<{ id: string, amount: number }[]> {
    const transaction = await this.getTransactionRecord(data.transactionId);
  
    if (!transaction) {
      throw new Error('Transaction not found');
    }
  
    const totalAmount = transaction.amount;
    const fixedFee = 0.2;
    const variableFee = 0.02;
  
    const merchantSplit = data.splits.find((split) => split.type === 'merchant');
    if (!merchantSplit) {
      throw new Error('Merchant split not found');
    }
  
    const merchantAmount = merchantSplit.amount;
    const variableFeeAmount = totalAmount * variableFee;
    const fixedFeeAmount = fixedFee * data.splits.length;
  
    const valpaySplit = data.splits.find((split) => split.type !== 'merchant');
    if (!valpaySplit) {
      throw new Error('Valpay split not found');
    }
  
    const valpayAmount = totalAmount - merchantAmount - variableFeeAmount - fixedFeeAmount;
  
    return [
      {
        id: merchantSplit.id,
        amount: merchantAmount,
      },
      {
        id: valpaySplit.id,
        amount: valpayAmount,
      },
      {
        id: 'fixedFee',
        amount: fixedFeeAmount,
      },
      {
        id: 'variableFee',
        amount: variableFeeAmount,
      },
    ];
  }

  public async getTransactionRecord(transactionId: string): Promise<Transaction | null> {
    const transaction = await this.transactionModel.findOne({ transactionId }).exec();
  
    return transaction;
  }

public async createPayoutRecord(data: PayoutNotificationData, payouts: { id: string, amount: number }[]): Promise<PayoutModel> {
  const payout = new this.payoutModel({
    date: data.date,
    merchantId: data.merchantId,
    payoutId: data.payoutId,
    transactionId: data.transactionId,
    splits: payouts.map((split) => ({
      id: split.id,
      amount: split.amount,
      fee: this.getFeeDetails(split.id),
    })),
  });

  await payout.save();

  return payout;
}
public getFeeDetails(splitId: string): { feeType: string, feeAmount: number, id: string } {
  if (splitId === 'fixedFee') {
    return {
      feeType: 'fixed',
      feeAmount: 0.2,
      id: splitId,
    };
  }

  if (splitId === 'variableFee') {
    return {
      feeType: 'percentage',
      feeAmount: 0.02,
      id: splitId,
    };
  }

  return {
    feeType: 'none',
    feeAmount: 0,
    id: splitId,
  };
}
}
export default PayoutNotificationHandler;