import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class UpdateExperienceDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  companyID?: ObjectId;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  location: string;

  @IsString()
  @IsOptional()
  description: string;

  // @IsDate()
  @IsOptional()
  joiningDate: Date;

  // @IsDate()
  @IsOptional()
  endingDate: Date;
}
