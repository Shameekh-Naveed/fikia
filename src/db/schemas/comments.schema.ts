import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';

export type CommentDocument = HydratedDocument<Comment>;

@Schema()
export class Comment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Post',
    required: true,
  })
  postID: Post;

  // @Prop({
  //   type: MongooseSchema.Types.ObjectId,
  //   ref: 'User',
  //   required: true,
  // })
  // userID: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['User', 'Company', 'University'] })
  ownerType: 'User' | 'Company' | 'University';

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'ownerType',
  })
  owner: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
