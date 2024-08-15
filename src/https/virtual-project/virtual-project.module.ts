import { Module, forwardRef } from '@nestjs/common';
import { VirtualProjectService } from './virtual-project.service';
import { VirtualProjectController } from './virtual-project.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { VirtualProjectSchema } from 'src/db/schemas/virtualProject.schema';
import { VirtualProjectApplicantSchema } from 'src/db/schemas/virtualProjectApplicant.schema';
import { PackagesService } from 'src/packages/packages.service';
import { StripeModule } from '../stripe/stripe.module';
import { UserModule } from '../user/user.module';
import { UploadModule } from '../upload/upload.module';
import { S3Service } from 'src/utils/s3.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'VirtualProject', schema: VirtualProjectSchema },
      {
        name: 'VirtualProjectApplicant',
        schema: VirtualProjectApplicantSchema,
      },
    ]),
    StripeModule,
    // forwardRef(() => UserModule),
    UserModule,
    UploadModule,
  ],
  controllers: [VirtualProjectController],
  providers: [VirtualProjectService, PackagesService,S3Service],
  exports: [VirtualProjectService],
})
export class VirtualProjectModule {}
