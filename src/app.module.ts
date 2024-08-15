import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { LanguageSeeder } from './db/seeders/language.seeder';
import { LanguageSchema } from './db/schemas/language.schema';
import { AuthModule } from './https/auth/auth.module';
import { UserModule } from './https/user/user.module';
import { TestModule } from './https/test/test.module';
import { UniversityModule } from './https/university/university.module';
import { GroupModule } from './https/group/group.module';
import { VirtualProjectModule } from './https/virtual-project/virtual-project.module';
import { ApplicationModule } from './https/application/application.module';
import { ConversationModule } from './https/conversation/conversation.module';
import { JobModule } from './https/job/job.module';
import { EventModule } from './https/event/event.module';
import { PostModule } from './https/post/post.module';
import { MulterModule } from '@nestjs/platform-express';
import { CommentModule } from './https/comment/comment.module';
import { CompanyModule } from './https/company/company.module';
import { ConfigModule } from '@nestjs/config';
import { StripeModule } from './https/stripe/stripe.module';
import { PackagesModule } from './packages/packages.module';
// import { EmailService } from './https/email/email.service';
import { UserSchema } from './db/schemas/user.schema';
import { UniversitySchema } from './db/schemas/university.schema';
import { CompanySchema } from './db/schemas/company.schema';
import { ReportModule } from './https/report/report.module';
import { UploadModule } from './https/upload/upload.module';
import { ConversationSchema } from './db/schemas/conversations.schema';
import { ConversationGateway } from './https/conversation/conversation.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),

    MongooseModule.forRoot(process.env.MONGO_URI),
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './uploads2',
    }),
    CronJobsModule,
    MongooseModule.forFeature([
      { name: 'Language', schema: LanguageSchema },
      { name: 'Conversation', schema: ConversationSchema },
    ]),
    AuthModule,
    UserModule,
    UniversityModule,
    TestModule,
    GroupModule,
    VirtualProjectModule,
    ApplicationModule,
    ConversationModule,
    JobModule,
    EventModule,
    PostModule,
    CommentModule,
    CompanyModule,
    StripeModule,
    PackagesModule,
    ReportModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService, LanguageSeeder, ConversationGateway],
})
export class AppModule {}
