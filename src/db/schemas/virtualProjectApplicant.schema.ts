import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';
import { Company } from './company.schema';

export type VirtualProjectApplicantDocument =
  HydratedDocument<VirtualProjectApplicant>;

@Schema()
export class ApplicationHistory {
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

  @Prop({ required: true, default: Date.now, type: Date })
  updateTime: Date;
}

@Schema()
export class Task {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    // TODO: Dont know if this'll work
    ref: 'VirtualProject.Task',
    required: true,
  })
  taskID: MongooseSchema.Types.ObjectId;

  @Prop({ default: false }) //false means not completed
  status: boolean;

  @Prop({ type: [String], default: [] })
  submissions: string[];

  @Prop()
  grade?: number;

  _id?: MongooseSchema.Types.ObjectId;
}

@Schema()
export class VirtualProjectApplicant {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'VirtualProject',
    required: true,
  })
  projectID: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  status: boolean;

  @Prop({ type: [Task], default: [] })
  tasks: Task[];

  @Prop({ type: Date })
  submissionDate?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: [], type: [ApplicationHistory] })
  history: ApplicationHistory[];
}

export const VirtualProjectApplicantSchema = SchemaFactory.createForClass(
  VirtualProjectApplicant,
);
