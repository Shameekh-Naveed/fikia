import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongoose';
import { Entity } from 'src/enums/entity.enum';
import { UserRole } from 'src/enums/user-role.enum';

export class CreateTextMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
