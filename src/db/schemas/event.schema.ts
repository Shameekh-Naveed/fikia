import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, ObjectId } from 'mongoose';
import { EventType } from 'src/enums/event-type.enum';
import { EventVisibility } from 'src/enums/event-visibility.enum';
import { Status } from 'src/enums/status.enum';

export type EventDocument = HydratedDocument<Event>;

@Schema()
export class EventHistory {
  @Prop({ required: true })
  changedField: string;

  @Prop({ required: true })
  updatedValue: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

@Schema()
export class Event {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: String, enum: EventType })
  type: EventType;

  @Prop({
    default: EventVisibility.PUBLIC,
    type: String,
    enum: EventVisibility,
  })
  visibility: EventVisibility;

  @Prop({ required: true, type: Date })
  start: Date;

  @Prop({ type: Date })
  end: Date;

  // @Prop({ required: true, enum: ['User', 'Company'] })
  // eventOwner: 'User';

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    // refPath: 'eventOwner',
    ref: 'User',
    required: true,
  })
  host: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'University',
    required: true,
  })
  university: MongooseSchema.Types.ObjectId;

  @Prop()
  venue: string;

  @Prop()
  eventLink: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  interested: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  going: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  notInterested: MongooseSchema.Types.ObjectId[];

  // @Prop({
  //   type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
  //   default: [],
  // })
  // invited: MongooseSchema.Types.ObjectId[];

  @Prop({ type: String, required: true })
  coverPhoto: String;

  @Prop({ type: String, enum: Status, default: Status.PENDING })
  status: Status;

  @Prop({ type: [EventHistory], default: [] })
  history: EventHistory[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
