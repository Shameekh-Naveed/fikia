import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Status } from 'src/enums/status.enum';

export type EventInvitationDocument = HydratedDocument<EventInvitation>;

@Schema()
export class EventInvitation {
  @Prop({ required: true, default: Status.PENDING, enum: Status })
  status: Status;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Event',
    required: true,
  })
  eventID: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  invitedBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  invited: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const EventInvitationSchema =
  SchemaFactory.createForClass(EventInvitation);
