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

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(ExperienceLevel)
  @IsNotEmpty()
  experienceLevel: ExperienceLevel;
}
