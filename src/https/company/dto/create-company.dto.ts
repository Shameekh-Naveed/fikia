import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ObjectId } from 'mongoose';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  employeeCount?: number;

  logo?: string;

  companyEnvironment?: string[];

  @IsString()
  @IsOptional()
  owner: ObjectId;
}
