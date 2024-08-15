import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, ObjectId } from 'mongoose';
import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export type UniversityDocument = HydratedDocument<University>;

@Schema()
export class University {
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  tagline: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  logo: string;

  @Prop({
    required: true,
    enum: ['approved', 'pending', 'blocked'],
    default: 'pending',
  })
  status: string;

  // @Prop({
  //   required: true,
  //   default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  // })
  // dueDate: Date;

  @Prop()
  coverPicture?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  owner: ObjectId;

  // @Prop({ required: true, default: undefined })
  // packageID: string | undefined;

  @Prop({ default: undefined })
  subscriptionID: string | undefined;

  // @Prop({
  //   type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Job' }],
  //   default: [],
  // })
  // approvedJobs: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const UniversitySchema = SchemaFactory.createForClass(University);
