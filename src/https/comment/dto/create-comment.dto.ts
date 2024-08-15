import { IsNotEmpty, IsString } from 'class-validator';
import { ObjectId } from 'mongoose';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  postID: ObjectId;

  @IsString()
  @IsNotEmpty()
  content: ObjectId;
}
