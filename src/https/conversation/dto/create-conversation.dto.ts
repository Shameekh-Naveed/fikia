import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ObjectId } from 'mongoose';
import { Entity, MessageParticipantType } from 'src/enums/entity.enum';
import { UserRole } from 'src/enums/user-role.enum';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  partnerID: ObjectId;

  @IsEnum(MessageParticipantType)
  @IsNotEmpty()
  partnerRole: MessageParticipantType;

  // @IsString()
  // @IsOptional()
  // roomID: String;
}
