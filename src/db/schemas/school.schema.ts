import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SchoolDocument = HydratedDocument<School>;

@Schema()
export class School {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  tagline: string[];

  @Prop({ required: true })
  about?: string;

  @Prop()
  instagram: string;

  @Prop()
  facebook: string;

  @Prop()
  linkedIn: string;

  @Prop()
  website: string;
}

export const SchoolSchema = SchemaFactory.createForClass(School);
