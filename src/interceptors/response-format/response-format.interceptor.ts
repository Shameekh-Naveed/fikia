import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { isInstance } from 'class-validator';
import { Observable, catchError, map, throwError } from 'rxjs';

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((res: unknown) => this.responseHandler(res, context)),
      // catchError((err: HttpException) =>
      //   throwError(() => this.errorHandler(err, context)),
      // ),
    );
  }

  responseHandler(res: any, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusCode = response.statusCode;
    const message = response instanceof String ? [response] : ['Success'];
    
    // Had to do it this way because instanceof String was not working for some APIs 
    const data =
      res instanceof String || typeof res === 'string'
        ? { message: [res] }
        : res;

    return {
      statusCode,
      message,
      data,
    };
  }

  // I like the default error handler better
  errorHandler(exception: HttpException, context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      status: false,
      statusCode: status,
      path: request.url,
      message: exception.message,
      result: exception,
    });
  }
}
