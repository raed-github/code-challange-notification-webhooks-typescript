import mongoose, { Document, Model, Schema } from 'mongoose';

interface Report extends Document {
  date: Date;
  merchantId: string;
  transactionTotals: {
    auth: number;
    refund: number;
    dispute: number;
  };
}

const reportSchema = new Schema({
  date: Date,
  merchantId: String,
  transactionTotals: {
    auth: Number,
    refund: Number,
    dispute: Number,
  },
});

class ReportModel {
  private static model: Model<Report>;

  public static getModel(): Model<Report> {
    if (!ReportModel.model) {
      ReportModel.model = mongoose.model<Report>('Report', reportSchema);
    }

    return ReportModel.model;
  }
}

export { Report, ReportModel };