import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Status } from 'src/enums/status.enum';

export class CreateTestDto {
  @Transform(({ value }) => value.toLowerCase())
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
