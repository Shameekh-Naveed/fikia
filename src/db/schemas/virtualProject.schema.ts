import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';
import { Company } from './company.schema';
import { JobStatus } from 'src/enums/job-status.enum';

export type VirtualProjectDocument = HydratedDocument<VirtualProject>;

@Schema()
export class Task {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String })
  explanatoryVid?: string;

  // TODO: ENUM-ify this as well
  @Prop({ required: true })
  duration: string;

  @Prop()
  time?: string;

  // @Prop({ type: [String], default: [] })
  // submissions: string[];

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: [String], default: [] })
  requiredSubmissions: number;

  _id?: MongooseSchema.Types.ObjectId;
}

@Schema()
export class VirtualProject {
  _id?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [String] })
  submission: string[];

  @Prop({ type: [String] })
  attachments: string[];

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  overview: string;

  @Prop({ required: true })
  thumbnail: string;

  @Prop({ type: String })
  introVid: string;

  // TODO: ENUM-ify this
  @Prop({ required: true })
  estimatedDuration: string;

  // TODO: ENUM-ify this
  @Prop({ required: true })
  difficulty?: string;

  // TODO: ENUM-ify this
  @Prop({ required: true })
  industryType: string;

  @Prop({ required: true, enum: JobStatus, default: JobStatus.ACTIVE })
  status: JobStatus;

  @Prop({ type: [Task], default: [] })
  tasks: Task[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
    required: true,
  })
  organizationID: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  recruiter: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'University' }],
    default: [],
  })
  approvingUnis: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true, default: Date.now() })
  createdAt: Date;
}

export const VirtualProjectSchema =
  SchemaFactory.createForClass(VirtualProject);
