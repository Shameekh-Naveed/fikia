import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Status } from 'src/enums/status.enum';

export type CompanyDocument = HydratedDocument<Company>;

@Schema()
export class Company {
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  logo: string;

  @Prop({ required: true, type: [String], default: [] })
  companyEnvironment: string[];

  @Prop({ required: true, enum: Status, default: Status.PENDING })
  status: Status;

  @Prop()
  employeeCount?: number;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  owner: MongooseSchema.Types.ObjectId;

  // TODO: Have to use it in the create API and everywhere else. Currently this is only in the email service
  @Prop()
  email: string;

  // @Prop({ required: true, default: undefined })
  // packageID: number | undefined;

  @Prop({ default: undefined })
  subscriptionID?: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
