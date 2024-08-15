import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class CreateEducationDto {
  @IsString()
  @IsOptional()
  uniName?: string;

  @IsString()
  @IsOptional()
  uniID?: ObjectId;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  categories: string[];

  @IsString()
  @IsNotEmpty()
  grade: string;

  // @IsDate()
  @IsNotEmpty()
  startDate: Date;

  // @IsDate()
  @IsOptional()
  endDate: Date;
}
