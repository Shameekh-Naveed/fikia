import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Group } from './group.schema';

export type GroupMemberDocument = HydratedDocument<GroupMember>;

@Schema()
export class GroupMember {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Post',
    required: true,
  })
  groupID: Group;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);
