import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';

export class CreateStudentDto extends PartialType(CreateAuthDto) {}
