import { Request } from 'express';
import { Model } from 'mongoose';

import { Transaction, TransactionModel } from '../models/transaction.model';

interface TransactionNotificationData {
  date: Date;
  amount: number;
  merchantId: string;
  transactionId: string;
  transactionType: 'AUTH' | 'REFUND' | 'DISPUTE';
}

class TransactionNotificationHandler {
  private transactionModel: Model<Transaction>;

  constructor() {
    this.transactionModel = TransactionModel.getModel();
  }

  public async receiveTransactionNotification(req: Request<any, any, TransactionNotificationData>): Promise<void> {
    const data: TransactionNotificationData = req.body;

    const transactionRecord = await this.getTransactionRecord(data.transactionId);
    if (transactionRecord) {
      await this.updateTransactionRecord(data, transactionRecord);
    } else {
      await this.createTransactionRecord(data);
    }
  }

  public async createTransactionRecord(data: TransactionNotificationData): Promise<Transaction> {
    const transaction = new this.transactionModel({
      ...data,
      mutationHistory: [{
        date: data.date,
        amount: data.amount,
        transactionType: data.transactionType,
      }],
    });

    await transaction.save();

    return transaction;
  }

  public async updateTransactionRecord(data: TransactionNotificationData, transactionRecord: Transaction): Promise<void> {
    const mutation = {
      date: data.date,
      amount: data.amount,
      transactionType: data.transactionType,
    };

    transactionRecord.amount += data.amount;
    transactionRecord.mutationHistory.push(mutation);

    await transactionRecord.save();
  }

  public async getTransactionRecord(transactionId: string): Promise<Transaction | null> {
    const transaction = await this.transactionModel.findOne(
      { transactionId },
      null,
      { maxTimeMS: 30000 } // set timeout to 30 seconds
    );
    return transaction;
  }
}

export default TransactionNotificationHandler;