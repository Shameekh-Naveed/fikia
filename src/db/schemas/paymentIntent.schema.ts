import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import type { Stripe as StripeType } from 'stripe';
import { University } from './university.schema';

export type PaymentIntentDocument = HydratedDocument<PaymentIntent>;

@Schema()
export class PaymentIntent {
  @Prop({ required: true })
  intentID: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const PaymentIntentSchema = SchemaFactory.createForClass(PaymentIntent);
