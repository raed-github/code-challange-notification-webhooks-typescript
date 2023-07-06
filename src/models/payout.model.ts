  import mongoose, { Document, Model, Schema } from 'mongoose';

  interface PayoutSplit {
    id: string;
    amount: number;
    fee: {
      feeType: string;
      feeAmount: number;
      id: string;
    };
  }

  interface Payout extends Document {
    date: Date;
    merchantId: string;
    payoutId: string;
    transactionId: string;
    splits: PayoutSplit[];
  }

  const payoutSchema = new Schema({
    date: Date,
    merchantId: String,
    payoutId: String,
    transactionId: String,
    splits: [{
      id: String,
      amount: Number,
      fee: {
        feeType: String,
        feeAmount: Number,
        id: String,
      },
    }],
  });

  class PayoutModel {
    private static model: Model<Payout>;

    public static getModel(): Model<Payout> {
      if (!PayoutModel.model) {
        PayoutModel.model = mongoose.model<Payout>('Payout', payoutSchema);
      }

      return PayoutModel.model;
    }
  }

  export { Payout, PayoutModel };