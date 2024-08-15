import { PartialType } from '@nestjs/mapped-types';
import { CreateVirtualProjectDto } from './create-virtual-project.dto';

export class UpdateVirtualProjectDto extends PartialType(CreateVirtualProjectDto) {}
