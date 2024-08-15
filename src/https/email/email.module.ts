import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from './email.service';
import { UserSchema } from 'src/db/schemas/user.schema';
import { UniversitySchema } from 'src/db/schemas/university.schema';
import { CompanySchema } from 'src/db/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'University', schema: UniversitySchema },
      { name: 'User', schema: UserSchema },
      { name: 'Company', schema: CompanySchema },
    ]),
  ],
  // controllers: [StripeController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
