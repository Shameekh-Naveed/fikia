import {
  MiddlewareConsumer,
  Module,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { UniversityService } from './university.service';
import { UniversityController } from './university.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UniversitySchema } from 'src/db/schemas/university.schema';
import { UserModule } from '../user/user.module';
import { PostModule } from '../post/post.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { ApplicationModule } from '../application/application.module';
import { EventModule } from '../event/event.module';
import { ApprovedStudentSchema } from 'src/db/schemas/approvedStudent.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'University', schema: UniversitySchema },
      { name: 'ApprovedStudent', schema: ApprovedStudentSchema },
    ]),
    // PostModule,
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    UploadModule,
    ApplicationModule,
    EventModule,
  ],
  controllers: [UniversityController],
  providers: [UniversityService],
  exports: [UniversityService],
})
export class UniversityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {}
}
