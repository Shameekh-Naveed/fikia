import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/db/schemas/user.schema';
import { GroupModule } from '../group/group.module';
import { ApplicationModule } from '../application/application.module';
import { PostModule } from '../post/post.module';
import { CommentModule } from '../comment/comment.module';
import { CompanyModule } from '../company/company.module';
import { UniversityModule } from '../university/university.module';
import { JobModule } from '../job/job.module';
import { PackagesService } from 'src/packages/packages.service';
import { StripeModule } from '../stripe/stripe.module';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from '../email/email.service';
import { EmailModule } from '../email/email.module';
import { VirtualProjectModule } from '../virtual-project/virtual-project.module';
import { UploadModule } from '../upload/upload.module';
import { ApprovedStudentSchema } from 'src/db/schemas/approvedStudent.schema';
import { AttachmentSchema } from 'src/db/schemas/attchment.schema';

@Module({
  imports: [
    forwardRef(() => PostModule),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'ApprovedStudent', schema: ApprovedStudentSchema },
      { name: 'Attachment', schema: AttachmentSchema },
    ]),
    forwardRef(() => ApplicationModule),
    forwardRef(() => UniversityModule),
    // forwardRef(() => GroupModule),
    GroupModule,
    // PostModule,
    CommentModule,
    CompanyModule,
    // UniversityModule,
    JobModule,
    forwardRef(() => StripeModule),
    // StripeModule,
    EmailModule,
    UploadModule,
  ],
  controllers: [UserController],
  providers: [UserService, PackagesService],
  exports: [UserService],
})
export class UserModule {}
