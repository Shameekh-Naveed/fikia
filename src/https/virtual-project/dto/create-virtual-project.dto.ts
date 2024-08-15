import {
  Transform,
  Type,
  plainToClass,
} from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export class TaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  explanatoryVid?: string;

  @IsString()
  @IsOptional()
  attachments?: string[];

  @IsNumber()
  @IsOptional()
  requiredSubmissions: number;

  @IsString()
  @IsOptional()
  time: string;

  @IsString()
  @IsNotEmpty()
  duration: string;
}
export class CreateVirtualProjectDto {
  @Transform(({ value }) => textToJSON(value))
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks: TaskDto[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  overview: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  introVid?: string;

  @IsString()
  @IsNotEmpty()
  estimatedDuration: string;

  @IsString()
  @IsNotEmpty()
  difficulty: string;

  @IsString()
  @IsNotEmpty()
  industryType: string;

  @IsString()
  @IsOptional()
  organizationID?: ObjectId;
}

const textToJSON = (text: string) => {
  try {
    const tasksData: TaskDto[] = JSON.parse(text);
    // convert all tasks to TaskDto class
    const tasks2: TaskDto[] = tasksData.map((taskData) =>
      plainToClass(TaskDto, taskData),
    );

    return tasks2;
  } catch (error) {
    return text;
  }
};
