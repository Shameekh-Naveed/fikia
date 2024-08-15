import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class PaginationPipe
  implements PipeTransform<string, number | undefined>
{
  transform(value: string, metadata: ArgumentMetadata): number | undefined {
    const argumentName = metadata.data;
    const parsedValue = parseInt(value, 10);
    if (value && isNaN(parsedValue))
      throw new BadRequestException(
        'Validation failed. Numeric string is expected',
      );

    switch (argumentName) {
      case 'page':
        return parsedValue || 1;
        break;
      case 'limit':
        return parsedValue || 10;
        break;
      default:
        return parsedValue || undefined;
    }
  }
}
