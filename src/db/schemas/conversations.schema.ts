import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { MessageParticipantType } from 'src/enums/entity.enum';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema()
export class Message {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  sender: MongooseSchema.Types.ObjectId;

  @Prop()
  content: string;

  @Prop()
  attachement?: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}

@Schema()
export class Participant {
  @Prop({ required: true, enum: ['User', 'Company', 'University'] })
  refType: 'User' | 'Company' | 'University';

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    refPath: 'refType',
    // ref: 'User',
  })
  participantID: MongooseSchema.Types.ObjectId;
}

@Schema()
export class Conversation {
  // @Prop({
  //   type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
  //   default: [],
  // })
  // participants: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [Participant], default: [] })
  participants: Participant[];

  @Prop({ type: [Message], default: [] })
  messages: Message[];

  @Prop()
  roomID?: String;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
