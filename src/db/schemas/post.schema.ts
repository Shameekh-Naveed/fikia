import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Group } from './group.schema';
import { PostType } from 'src/enums/post-type.enum';
// import { Student } from './student.schema';

export type PostDocument = HydratedDocument<Post>;

@Schema()
export class Post {
  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop()
  title?: string;

  // @Prop({ required: true })
  // isArticle: boolean;

  // @Prop({ required: true })
  // isGroupPost: boolean;

  @Prop({ enum: PostType, required: true })
  postType: PostType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Group',
  })
  groupID?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Event',
  })
  eventID?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['User', 'Company', 'University'] })
  ownerType: 'User' | 'Company' | 'University';

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'ownerType',
  })
  owner: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  likedBy: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
