import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/enums/status.enum';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;

  // @IsString()
  // @IsOptional()
  // packageID?: string;
}
