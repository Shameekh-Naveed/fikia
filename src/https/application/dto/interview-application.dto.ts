import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-application.dto';
import { IsDate, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class InterviewApplicationDto {
  @IsDate()
  @IsNotEmpty()
  interviewDate: Date;

  @IsString()
  @IsNotEmpty()
  interviewVenue: string;
}
