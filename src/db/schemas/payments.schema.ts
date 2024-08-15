import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { University } from './university.schema';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema()
export class Payment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Student',
    required: true,
  })
  userID: University;

  @Prop({ required: true })
  stripeID: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['approved', 'banned', 'pending'] })
  status: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
