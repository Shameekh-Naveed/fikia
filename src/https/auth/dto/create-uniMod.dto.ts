import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';

export class CreateUniModDto extends PartialType(CreateAuthDto) {}
