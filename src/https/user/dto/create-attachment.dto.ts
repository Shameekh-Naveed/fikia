import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class CreateAttachmentDto {
  filePath: string;

  @IsString()
  @IsOptional()
  category: string;
}
