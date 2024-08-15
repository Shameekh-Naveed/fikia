import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { GroupVisibility } from 'src/enums/group-visibility.enum';

export type GroupDocument = HydratedDocument<Group>;

@Schema()
export class Group {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  coverPhoto?: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({
    required: true,
    enum: GroupVisibility,
    default: GroupVisibility.PUBLIC,
  })
  visibility: GroupVisibility;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  members: MongooseSchema.Types.ObjectId[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
