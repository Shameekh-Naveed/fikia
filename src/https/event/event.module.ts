import { Module, forwardRef } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EventSchema } from 'src/db/schemas/event.schema';
import { FirebaseService } from 'src/firebase/firebase.service';
import { EventInvitationSchema } from 'src/db/schemas/eventInvitation.schema';
import { UploadModule } from '../upload/upload.module';
import { CompanyModule } from '../company/company.module';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Event', schema: EventSchema },
      {
        name: 'EventInvitation',
        schema: EventInvitationSchema,
      },
    ]),
    UploadModule,
    forwardRef(() => UserModule),
  ],
  controllers: [EventController],
  providers: [EventService, FirebaseService],
  exports: [EventService],
})
export class EventModule {}
