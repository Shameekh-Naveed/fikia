import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-application.dto';
import { IsDate, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class ShortlistApplicationDto {
  @IsDate()
  @IsNotEmpty()
  shortlistDate: Date;
}
