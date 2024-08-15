import {
  Allow,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class ApprovedStudentDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsDate()
  @IsNotEmpty()
  dateOfBirth: Date;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  universityId: ObjectId;
}
