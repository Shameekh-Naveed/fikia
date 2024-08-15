import {
  IsDate,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ObjectId } from 'mongoose';
import { EventType } from 'src/enums/event-type.enum';
import { EventVisibility } from 'src/enums/event-visibility.enum';
import { Status } from 'src/enums/status.enum';
export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsUrl()
  @IsOptional()
  coverPhoto?: string;

  @IsEnum(EventType)
  @IsOptional()
  type: EventType;

  @IsEnum(EventVisibility)
  @IsOptional()
  visibility: EventVisibility;

  @ValidateIf((o) => o.type === EventType.PHYSICAL)
  @IsString()
  @IsOptional()
  venue?: string;

  @ValidateIf((o) => o.type === EventType.VIRTUAL)
  @IsUrl()
  eventLink?: string;

  @IsDate()
  @IsOptional()
  start: Date;

  @IsDate()
  @IsOptional()
  end: Date;

  @IsString()
  @IsOptional()
  university?: ObjectId;

  @IsEnum(Status)
  @IsOptional()
  status: Status;
}
