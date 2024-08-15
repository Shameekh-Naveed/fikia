import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ObjectIdValidationPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string, metadata: ArgumentMetadata): Types.ObjectId {
    if (!value) return null;
    const isValidObjectId = Types.ObjectId.isValid(value);
    if (!isValidObjectId) {
      throw new BadRequestException('Invalid ObjectId');
    }
    return new Types.ObjectId(value);
    // return Types.ObjectId.createFromHexString(value);
  }
}
