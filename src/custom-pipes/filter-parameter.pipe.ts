import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { isNumber } from 'class-validator';

@Injectable()
export class FilterParameterPipe
  implements PipeTransform<string, number | undefined | string | boolean>
{
  transform(value: number | string | boolean, metadata: ArgumentMetadata) {
    if (value === undefined || value === '') return undefined;
    if (+value) return +value;
    else if (value === 'true') return true;
    else if (value === 'false') return false;
    else return value;
  }
}
