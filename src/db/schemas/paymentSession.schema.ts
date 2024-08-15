import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Status } from 'src/enums/status.enum';

export type PaymentSessionDocument = HydratedDocument<PaymentSession>;

@Schema()
export class PaymentSession {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId | Types.ObjectId;

  @Prop({ required: true })
  priceID: string;

  @Prop({ required: true })
  subscriptionID: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  organizationID: string;

  @Prop()
  intentID?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: Status, default: Status.PENDING })
  status: Status;

  @Prop({ required: true })
  expirationDate: Date;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const PaymentSessionSchema =
  SchemaFactory.createForClass(PaymentSession);
