import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongoose';
import { ExperienceLevel } from 'src/enums/user-role.enum';

export class UpdateSkillDto {
  @IsString()
  title: string;

  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;
}
