import mongoose, { Document, Model, Schema } from 'mongoose';

interface TransactionMutation {
  date: Date;
  amount: number;
  transactionType: 'AUTH' | 'REFUND' | 'DISPUTE';
}

interface Transaction extends Document {
  date: Date;
  amount: number;
  merchantId: string;
  transactionId: string;
  transactionType: 'AUTH' | 'REFUND' | 'DISPUTE';
  mutationHistory: TransactionMutation[];
}

const transactionSchema = new Schema({
  date: Date,
  amount: Number,
  merchantId: String,
  transactionId: String,
  transactionType: {
    type: String,
    enum: ['AUTH', 'REFUND', 'DISPUTE'],
  },
  mutationHistory: [{
    date: Date,
    amount: Number,
    transactionType: {
      type: String,
      enum: ['AUTH', 'REFUND', 'DISPUTE'],
    },
  }],
});

class TransactionModel {
  private static model: Model<Transaction>;

  public static getModel(): Model<Transaction> {
    if (!TransactionModel.model) {
      TransactionModel.model = mongoose.model<Transaction>('Transaction', transactionSchema);
    }

    return TransactionModel.model;
  }
}

export { Transaction, TransactionModel };