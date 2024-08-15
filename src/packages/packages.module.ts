import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
// import { StripeService } from 'src/https/stripe/stripe.service';
import { StripeModule } from 'src/https/stripe/stripe.module';
import { StripeService } from 'src/https/stripe/stripe.service';
// import { PackagesController } from './packages.controller';

@Module({
  // controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
