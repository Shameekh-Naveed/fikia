import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentSessionSchema } from 'src/db/schemas/paymentSession.schema';
import { PaymentIntentSchema } from 'src/db/schemas/paymentIntent.schema';
import { EmailModule } from '../email/email.module';
import { UniversityModule } from '../university/university.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PaymentIntent', schema: PaymentIntentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'PaymentSession', schema: PaymentSessionSchema },
    ]),
    EmailModule,
    // UniversityModule,
    forwardRef(() => UniversityModule),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
