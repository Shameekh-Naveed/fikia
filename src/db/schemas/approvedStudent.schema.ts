import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';
import { Company } from './company.schema';

export type ApprovedStudentDocument = HydratedDocument<ApprovedStudent>;

@Schema()
export class ApprovedStudent {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'University',
    required: true,
  })
  universityID: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ default: '' })
  lastName?: string;

  @Prop({ required: true, type: Date })
  dateOfBirth: Date;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  id: string;
}

export const ApprovedStudentSchema =
  SchemaFactory.createForClass(ApprovedStudent);
