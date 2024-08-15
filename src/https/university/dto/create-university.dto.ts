import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { Status } from 'src/enums/status.enum';

export class CreateUniversityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tagline: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  @IsOptional()
  logo: string;

  @IsUrl()
  @IsOptional()
  coverPicture?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
