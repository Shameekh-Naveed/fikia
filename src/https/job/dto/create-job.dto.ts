import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { ObjectId } from 'mongoose';
import { JobLevel } from 'src/enums/job-status.enum';
import { Status } from 'src/enums/status.enum';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  companyID?: ObjectId;

  @IsString()
  @IsNotEmpty()
  venue: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsEnum(JobLevel)
  @IsNotEmpty()
  level: JobLevel;

  @IsString()
  @IsNotEmpty()
  industry: string;

  @IsString()
  @IsNotEmpty()
  qualification: string;

  @IsString()
  @IsNotEmpty()
  responsibilities: string;

  @IsNumber()
  @IsNotEmpty()
  minSalary: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  viewers:string[];

  @IsNumber()
  @IsNotEmpty()
  maxSalary: number;


}
