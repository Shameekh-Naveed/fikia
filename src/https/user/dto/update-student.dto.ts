import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Status } from 'src/enums/status.enum';

export class UpdateStudentDto {
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
