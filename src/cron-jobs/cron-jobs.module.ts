import { Module } from '@nestjs/common';
import { CronJobsService } from './cron-jobs.service';
import { CronJobsController } from './cron-jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UniversitySchema } from 'src/db/schemas/university.schema';
import { UserSchema } from 'src/db/schemas/user.schema';
import { VirtualProjectModule } from 'src/https/virtual-project/virtual-project.module';
import { CompanyModule } from 'src/https/company/company.module';
import { CompanySchema } from 'src/db/schemas/company.schema';
import { EventSchema } from 'src/db/schemas/event.schema';
import { FirebaseService } from 'src/firebase/firebase.service';
import { PaymentSessionSchema } from 'src/db/schemas/paymentSession.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'University', schema: UniversitySchema },
      { name: 'User', schema: UserSchema },
      { name: 'Company', schema: CompanySchema },
      { name: 'Event', schema: EventSchema },
      { name: 'PaymentSession', schema: PaymentSessionSchema },
    ]),
    VirtualProjectModule,
  ],
  controllers: [CronJobsController],
  providers: [CronJobsService, FirebaseService],
})
export class CronJobsModule {}
