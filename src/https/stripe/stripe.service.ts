import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateStripeDto } from './dto/create-stripe.dto';
import { UpdateStripeDto } from './dto/update-stripe.dto';
import type { Stripe as StripeType } from 'stripe';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/enums/user-role.enum';
import { Model, ObjectId, Schema, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PaymentIntent } from 'src/db/schemas/paymentIntent.schema';
import { PaymentSession } from 'src/db/schemas/paymentSession.schema';
import { Status } from 'src/enums/status.enum';
import { createSubscriptionDto } from './dto/create-subscription.dto';
import { EmailService } from '../email/email.service';
import { UniversityService } from '../university/university.service';

@Injectable()
export class StripeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectModel('PaymentIntent') private intentModel: Model<PaymentIntent>,
    @InjectModel('PaymentSession') private sessionModel: Model<PaymentSession>,
    @Inject(forwardRef(() => UniversityService))
    private readonly universityService: UniversityService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      // apiVersion: '2022-11-15',
      typescript: true,
    });
  }
  private stripe: StripeType;

  async generatePaymentSession(
    productID: string,
    role: UserRole,
    organizationID: ObjectId,
    userID: ObjectId,
  ) {
    const strOrgID = organizationID.toString();
    const strUserID = userID.toString();
    const prices = await this.stripe.prices.list({
      product: productID,
      expand: ['data.product'],
    });
    const session = await this.stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: {
        role,
        organizationID: strOrgID,
        userID: strUserID,
      },
      allow_promotion_codes: true,
      success_url: 'https://www.google.com/',
      cancel_url: `https://www.example.com`,
    });
    return { url: session.url };
  }

  async createPaymentIntent(intentID: string, amount: number) {
    const intent = new this.intentModel({
      intentID,
      amount,
    });
    await intent.save();
    return 'success';
  }

  async createPaymentSession(
    userID: Types.ObjectId | Schema.Types.ObjectId,
    organizationID: Types.ObjectId,
    priceID: string,
    amount: number,
    // intentID: string | Stripe.PaymentIntent | undefined,
    subscriptionID: string | Stripe.Subscription,
    role: UserRole,
    expirationDate: Date,
  ) {
    const session = new this.sessionModel({
      userID,
      organizationID,
      priceID,
      amount,
      // intentID,
      subscriptionID,
      status: Status.INREVIEW,
      expirationDate,
    });
    await session.save();
    // await this.emailService.paymentVerification(
    //   userID,
    //   Date.now().toString(),
    //   amount,
    //   subscriptionID.toString(),
    // );
    // ? Also notify superadmin so he can approve or just approve the uni yourself
    if (role === UserRole.UNI_ADMIN)
      await this.universityService.update(organizationID, {
        status: Status.APPROVED,
      });
    return 'success';
  }

  // ? Running on the assumption that intent price is always equal to session price
  async findSession(intentID: string) {
    const session = await this.sessionModel.findOne({
      intentID,
      status: Status.PENDING,
    });
    if (!session) return false;
    session.status = Status.INREVIEW;
    await session.save();
    // ? Also notify superadmin so he can approve
    return 'success';
  }

  async findIntentAndApproveSession(
    intentID: string | Stripe.PaymentIntent,
    sessionID?: string,
  ) {
    const intent = await this.intentModel.findOne({ intentID });
    if (!intent) return false;
    // TODO: Could also use the sessionID from above if accomodated in the schema
    const session = await this.sessionModel.findOne({
      intentID,
      status: Status.PENDING,
    });
    if (!session) return false;
    session.status = Status.INREVIEW;
    await session.save();
    // ? Also notify superadmin so he can approve or just approve the uni yourself
    await this.universityService.update(
      new Schema.Types.ObjectId(session.organizationID),
      {
        status: Status.BLOCKED,
      },
    );
    return 'success';
  }

  verifyStriptWebhookSignature(
    body: any,
    signature: string,
  ): [StripeType.Event | null, null | string] {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET'),
      );

      return [event, null];
    } catch (error) {
      console.log(error);
      return [null, 'Error verifying stripe webhook signature'];
    }
  }

  async retrieveSession(
    sessionId: string,
  ): Promise<
    [StripeType.Response<StripeType.Checkout.Session> | null, string | null]
  > {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
      });
      //session.line_items include all products in the session, if you added metadata to the session, you can retrieve it here
      return [session, null];
    } catch (error) {
      return [null, 'Error retrieving session'];
    }
  }

  generateLookupKey(name: string) {
    const random = Math.random().toString(36).substring(5);
    return name.toLowerCase().replace(/\s/g, '_') + '_' + random;
  }

  async createPackage(stripe: CreateStripeDto) {
    const { name, description, unit_amount, interval, role } = stripe;
    const currency = 'usd';
    const lookup_key = this.generateLookupKey(name);
    // * Unit amount is in cents
    const unit_amount_full = unit_amount * 100;
    const product = await this.stripe.products.create({
      name,
      description,
      metadata: { role },
    });
    const price = await this.stripe.prices.create({
      product: product.id,
      currency,
      unit_amount: unit_amount_full,
      lookup_key,
      recurring: { interval },
    });
    return { product, price };
  }

  // async createSubscription(subscription: createSubscriptionDto) {
  //   const { customer, price } = subscription;
  //   const newSubscription = await this.stripe.subscriptions.create({
  //     customer,
  //     items: [{ price }],
  //   });
  //   console.log({ newSubscription });
  //   return newSubscription;
  // }

  async getSubscriptionInfo(subscriptionID: string) {
    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionID);
    return subscription;
  }

  async getSubscription(organizationID: ObjectId) {
    // return subscriptions;
    // const subscriptionID = await this.sessionModel
    //   .findOne({
    //     organizationID,
    //   })
    //   .select('subscriptionID');
    const subscriptions = await this.sessionModel
      .find({
        organizationID,
      })
      .sort({ createdAt: -1 });
    // if (!subscriptions) throw new NotFoundException('No subscription found');
    if (!subscriptions) return false;

    const subscriptionID = subscriptions[0]?.subscriptionID || '';
    if (!subscriptionID) return false;

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionID);
    const { status, current_period_end, current_period_start } = subscription;
    const productID = subscription.items.data[0].price.product as string;
    return { status, current_period_end, current_period_start, productID };
  }

  async getAllProducts() {
    const products = await this.stripe.products.list();
    return products;
  }
}
