import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type LanguageDocument = HydratedDocument<Language>;

@Schema()
export class Language {
  @Prop({ required: true })
  name: string;
}

export const LanguageSchema = SchemaFactory.createForClass(Language);
