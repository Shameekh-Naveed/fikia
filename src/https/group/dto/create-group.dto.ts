import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GroupVisibility } from 'src/enums/group-visibility.enum';

export class CreateGroupDto {
  @IsString()
  @IsOptional()
  coverPhoto?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(GroupVisibility)
  @IsNotEmpty()
  visibility: GroupVisibility;
}
