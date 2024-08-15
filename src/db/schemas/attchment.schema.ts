import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';
import { Group } from './group.schema';
import { University } from './university.schema';
import { Company } from './company.schema';
import { Job } from './job.schema';

export type AttachmentDocument = HydratedDocument<Attachment>;

@Schema()
export class Attachment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  filePath: string;

  @Prop()
  category: string;

  @Prop()
  otherInfo?: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
