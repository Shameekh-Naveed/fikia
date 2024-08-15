import { PartialType } from '@nestjs/mapped-types';
import { CreateUniversityDto } from './create-university.dto';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/enums/status.enum';

export class UpdateUniversityDto extends PartialType(CreateUniversityDto) {
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  // @IsString()
  // @IsOptional()
  // packageID?: string;
}
