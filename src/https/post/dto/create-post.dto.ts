import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ObjectId } from 'mongoose';
import { PostType } from 'src/enums/post-type.enum';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  summary: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images: string[];

  @Transform((body) => body.obj.isGroupPost.toString().toLowerCase())
  @IsEnum(['true', 'false'])
  @IsNotEmpty()
  isGroupPost: boolean;

  @Transform((body) => body.obj.isEventPost.toString().toLowerCase())
  @IsEnum(['true', 'false'])
  @IsNotEmpty()
  isEventPost: boolean;

  @IsEnum(PostType)
  @IsNotEmpty()
  postType: PostType;

  @ValidateIf((o) => o.isGroupPost?.toLowerCase() === 'true')
  @IsString()
  @IsNotEmpty()
  groupID: ObjectId;

  @ValidateIf((o) => o.isEventPost?.toLowerCase() === 'true')
  @IsString()
  @IsNotEmpty()
  eventID: ObjectId;
}
