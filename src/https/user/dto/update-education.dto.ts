import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class UpdateEducationDto {
  @IsString()
  @IsOptional()
  uniName?: string;

  @IsString()
  @IsOptional()
  uniID?: ObjectId;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  // TODO: Convert to arr
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories: string[];

  @IsString()
  @IsOptional()
  grade: string;

  // @IsDate()
  @IsOptional()
  startDate: Date;

  // @IsDate()
  @IsOptional()
  endDate: Date;
}
