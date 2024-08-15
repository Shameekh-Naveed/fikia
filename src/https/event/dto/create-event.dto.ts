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

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  @IsOptional()
  coverPhoto?: string;

  @IsEnum(EventType)
  @IsNotEmpty()
  type: EventType;

  @IsEnum(EventVisibility)
  @IsNotEmpty()
  visibility: EventVisibility;

  @ValidateIf((o) => o.type === EventType.PHYSICAL)
  @IsString()
  venue?: string;

  @ValidateIf((o) => o.type === EventType.VIRTUAL)
  @IsUrl()
  eventLink?: string;

  @IsDate()
  @IsNotEmpty()
  start: Date;

  @IsDate()
  @IsOptional()
  end: Date;

  @IsString()
  @IsOptional()
  host?: ObjectId;

  @IsString()
  @IsOptional()
  university?: ObjectId;

  @IsString()
  @IsOptional()
  eventOwner?: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}
