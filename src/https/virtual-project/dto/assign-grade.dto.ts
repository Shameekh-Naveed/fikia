import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { ObjectId } from 'mongoose';

export class AssignGradeDto {
  @IsString()
  @IsNotEmpty()
  taskID: ObjectId;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(5)
  grade: number;
}
