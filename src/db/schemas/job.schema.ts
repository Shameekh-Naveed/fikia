import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';
import { Company } from './company.schema';
import { Status } from 'src/enums/status.enum';
import { JobLevel, JobStatus } from 'src/enums/job-status.enum';

export type JobDocument = HydratedDocument<Job>;

@Schema()
export class Job {
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: Status, default: Status.PENDING })
  status: Status;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
  })
  companyID: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['onsite', 'remote', 'hybrid'] })
  venue: string;

  @Prop({ required: true, enum: ['fulltime', 'parttime', 'internship'] })
  type: string;

  @Prop({ required: true, enum: JobLevel })
  level: string;

  @Prop({ required: true, type: Number })
  minSalary: number;

  @Prop({ required: true, type: Number })
  maxSalary: number;

  @Prop({ required: true })
  industry: string;

  @Prop()
  qualification: string;

  @Prop()
  responsibilities: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'University' }],
    default: [],
  })
  approvingUnis: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  viewers: MongooseSchema.Types.ObjectId[];

  @Prop({
    default:0
  })
  applicants:number
  @Prop({ default: () => new Date(Date.now() + parseInt(process.env.THIRTY_DAYS_EXPIRY)) })
  expiryDate: Date; // New property for job expiry date, set to 30 days later from creation

  calculateExpiryDate() {
    this.expiryDate = new Date(Date.now() +  parseInt(process.env.THIRTY_DAYS_EXPIRY));
  }
}

export const JobSchema = SchemaFactory.createForClass(Job);
