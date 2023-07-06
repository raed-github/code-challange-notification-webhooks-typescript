import { Request } from 'express';
import mongoose from 'mongoose';

import { Transaction, TransactionModel } from '../models/transaction.model';
import { Report, ReportModel } from '../models/report.model';

interface EndOfDayReportData {
  date: Date;
  merchantId: string;
  transactionTotals: {
    auth: number;
    refund: number;
    dispute: number;
  };
}

class EndOfDayReportHandler {
  private transactionModel: mongoose.Model<Transaction>;
  private reportModel: mongoose.Model<Report>;

  constructor() {
    this.transactionModel = TransactionModel.getModel();
    this.reportModel = ReportModel.getModel();
  }

  public async receiveEndOfDayReport(req: Request): Promise<void> {
    const data: EndOfDayReportData = {
      ...req.body,
      date: new Date(req.body.date),
    };
  
    const transactions = await this.getTransactionRecords(data.merchantId, data.date);
    await this.reconcileTransactionsWithReport(transactions, data);
    await this.createReportRecord(data);
  }

  public async reconcileTransactionsWithReport(transactions: Transaction[], report: EndOfDayReportData): Promise<void> {
    const authTotal = transactions.reduce((total, transaction) => {
      if (transaction.transactionType === 'AUTH') {
        return total + transaction.mutationHistory.reduce((mutationTotal, mutation) => {
          if (mutation.transactionType === 'AUTH' && mutation.date.getTime() === report.date.getTime()) {
            return mutationTotal + mutation.amount;
          }
          return mutationTotal;
        }, 0);
      }
      return total;
    }, 0);

    if (authTotal !== report.transactionTotals.auth) {
      throw new Error(`Auth total does not match. Expected ${report.transactionTotals.auth}, but found ${authTotal}`);
    }

    const refundTotal = transactions.reduce((total, transaction) => {
      if (transaction.transactionType === 'REFUND') {
        return total + transaction.mutationHistory.reduce((mutationTotal, mutation) => {
          if (mutation.transactionType === 'REFUND' && mutation.date.getTime() === report.date.getTime()) {
            return mutationTotal + mutation.amount;
          }

          return mutationTotal;
        }, 0);
      }

      return total;
    }, 0);

    const disputeTotal = transactions.reduce((total, transaction) => {
      if (transaction.transactionType === 'DISPUTE') {
        return total + transaction.mutationHistory.reduce((mutationTotal, mutation) => {
          if (mutation.transactionType === 'DISPUTE' && mutation.date.getTime() === report.date.getTime()) {
            return mutationTotal + mutation.amount;
          }

          return mutationTotal;
        }, 0);
      }

      return total;
    }, 0);

    if (authTotal !== report.transactionTotals.auth) {
      throw new Error(`Auth total does not match. Expected ${report.transactionTotals.auth}, but found ${authTotal}`);
    }

    if (refundTotal !== report.transactionTotals.refund) {
      throw new Error(`Refund total does not match. Expected ${report.transactionTotals.refund}, but found ${refundTotal}`);
    }

    if (disputeTotal !== report.transactionTotals.dispute) {
      throw new Error(`Dispute total does not match. Expected ${report.transactionTotals.dispute}, but found ${disputeTotal}`);
    }
  }

  public async getTransactionRecords(merchantId: string, date: Date): Promise<Transaction[]> {
    const transactions = await this.transactionModel.find({
      merchantId,
      date: {
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      },
    }).exec();

    return transactions;
  }

  public async createReportRecord(data: EndOfDayReportData): Promise<Report> {
    const report = new this.reportModel({
      ...data,
    });

    await report.save();

    return report;
  }
}

export default EndOfDayReportHandler;