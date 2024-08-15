import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  IsUrl,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class CommentPostDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
