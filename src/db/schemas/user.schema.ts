import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Post } from './post.schema';
import { Group } from './group.schema';
import { University } from './university.schema';
import { Company } from './company.schema';
import { Job } from './job.schema';
import { Status } from 'src/enums/status.enum';
import { ExperienceLevel, UserRole } from 'src/enums/user-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class Experience {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  joiningDate: Date;

  @Prop()
  endingDate?: Date;

  @Prop()
  description: string;

  @Prop()
  companyName?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
  })
  companyID: MongooseSchema.Types.ObjectId;

  _id?: MongooseSchema.Types.ObjectId;
}

@Schema()
export class Education {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ required: true })
  grade: string;

  @Prop()
  description: string;

  @Prop()
  endDate?: Date;

  @Prop()
  uniName?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'University',
  })
  uniID: MongooseSchema.Types.ObjectId;

  _id?: MongooseSchema.Types.ObjectId;
}

@Schema()
export class Skill {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ExperienceLevel })
  experience: ExperienceLevel;

  _id?: MongooseSchema.Types.ObjectId;
}

@Schema()
export class StudentData {
  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true, enum: ['Male', 'Female', 'Other'] })
  gender: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  website?: string;

  @Prop({
    required: true,
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Language' }],
  })
  languages: MongooseSchema.Types.ObjectId[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  following: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [Experience], default: [] })
  experiences: Experience[];

  @Prop({ type: [Education], default: [] })
  educations: Education[];

  @Prop({ type: [Skill], default: [] })
  skills: Skill[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'University',
    required: true,
  })
  university: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Post' }],
    default: [],
  })
  dislikedPosts: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Post' }],
    default: [],
  })
  likedPosts: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Group' }],
    default: [],
  })
  groups: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Event' }],
    default: [],
  })
  savedEvents: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Company' }],
    default: [],
  })
  followedCompanies: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Job' }],
    default: [],
  })
  savedJobs: MongooseSchema.Types.ObjectId[];
}

@Schema()
export class UniModData {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'University',
    // required: true,
  })
  uniID: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
  })
  position: string;
}

@Schema()
export class CompanyModData {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
    // required: true,
  })
  companyID: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
  })
  position: string;
}

@Schema()
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  profilePicture?: string;

  @Prop({
    required: true,
    enum: UserRole,
  })
  role: UserRole;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: StudentData })
  studentDetails?: StudentData;

  @Prop({ type: UniModData })
  uniModDetails?: UniModData;

  @Prop({ type: CompanyModData })
  companyModDetails?: CompanyModData;

  @Prop({ enum: Status, default: Status.PENDING })
  status: Status;

  @Prop()
  lastLogin?: Date;

  // Store the firebase FCM token for push notifications
  @Prop()
  deviceToken?: string;

  _id: MongooseSchema.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
