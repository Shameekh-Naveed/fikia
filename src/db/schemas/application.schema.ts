import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Group } from './group.schema';
import { Job } from './job.schema';
import { ApplicationStatus } from 'src/enums/application-status.enum';

export type ApplicationDocument = HydratedDocument<Application>;

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
export class Application {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Job',
    required: true,
  })
  jobID: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userID: MongooseSchema.Types.ObjectId;

  @Prop()
  rating?: number;

  @Prop({
    required: true,
    enum: ApplicationStatus,
    default: ApplicationStatus.IN_REVIEW,
  })
  stage?: string;

  @Prop({ required: true })
  resume: string;

  @Prop()
  shortlistDate?: Date;

  @Prop()
  interviewDate?: Date;

  @Prop()
  interviewVenue?: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: [], type: [ApplicationHistory] })
  history: ApplicationHistory[];
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
