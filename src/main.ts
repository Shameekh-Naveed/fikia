import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { LanguageSeeder } from './db/seeders/language.seeder';
import { ResponseFormatInterceptor } from './interceptors/response-format/response-format.interceptor';
import { ConfigService } from '@nestjs/config';
import { WsAdapter } from '@nestjs/platform-ws';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    // * bodyParser: true, minor testing indicates everything to be working just fine without this
  });
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT');
  app.enableCors();

  // const languageSeeder = app.get(LanguageSeeder);
  // await languageSeeder.seed();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true, // allow conversion underneath
      },
    }),
  );
  app.use(cookieParser());

  app.useGlobalInterceptors(new ResponseFormatInterceptor());
  // app.useWebSocketAdapter(new WsAdapter(app));
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(PORT);
}
bootstrap();
