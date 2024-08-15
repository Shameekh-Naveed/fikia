import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationSchema } from 'src/db/schemas/conversations.schema';
import { UserModule } from '../user/user.module';
import { UploadModule } from '../upload/upload.module';
import { CompanyModule } from '../company/company.module';
import { UniversityModule } from '../university/university.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Conversation', schema: ConversationSchema },
    ]),
    UserModule,
    CompanyModule,
    UniversityModule,
    UploadModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
