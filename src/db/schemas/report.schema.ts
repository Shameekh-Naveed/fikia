import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ReportStatus } from 'src/enums/report-status.enum';

export type ReportDocument = HydratedDocument<Report>;

@Schema()
export class Report {
  @Prop({ required: true, default: ReportStatus.PENDING, enum: ReportStatus })
  status: ReportStatus;

  @Prop({ required: true })
  reason: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  reportedBy: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['User', 'Post', 'Event'] })
  category: 'User' | 'Post' | 'Event';

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'category',
  })
  reportedObj: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
