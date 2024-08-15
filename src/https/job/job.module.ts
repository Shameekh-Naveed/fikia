import { Module, forwardRef } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { JobSchema } from 'src/db/schemas/job.schema';
import { UserModule } from '../user/user.module';
import { ApplicationModule } from '../application/application.module';
import { ApplicationSchema } from 'src/db/schemas/application.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Job', schema: JobSchema },
      { name: 'Application', schema: ApplicationSchema },
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {}
