import { Module, forwardRef } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationSchema } from 'src/db/schemas/application.schema';
import { JobModule } from '../job/job.module';
import { UserModule } from '../user/user.module';
import { UploadModule } from '../upload/upload.module';
import { JobSchema } from 'src/db/schemas/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Application', schema: ApplicationSchema },
      { name: 'Job', schema: JobSchema },
    ]),
    JobModule,
    forwardRef(() => UserModule),
    UploadModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
