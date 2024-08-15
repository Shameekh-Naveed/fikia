import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongoose';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobID: ObjectId;

  userID: ObjectId;

  resume: string;

  @IsString()
  @IsOptional()
  rating?: number;
}
