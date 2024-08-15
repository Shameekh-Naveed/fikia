import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
// import { LocalStrategy } from './strategies/local-strategy';
// import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './strategies/jwt-strategy';
import { RefreshJwtStrategy } from './strategies/refreshToken.strategy';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/db/schemas/user.schema';
import { GroupModule } from '../group/group.module';
import { ApplicationModule } from '../application/application.module';
import { CommentModule } from '../comment/comment.module';
import { PostModule } from '../post/post.module';
import { ConfigService } from '@nestjs/config';
import { UniversityModule } from '../university/university.module';
import { CompanyModule } from '../company/company.module';
import { StripeModule } from '../stripe/stripe.module';
import { VirtualProjectModule } from '../virtual-project/virtual-project.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    // TypeOrmModule.forFeature([User]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    // GroupModule,
    // ApplicationModule,
    // CommentModule,
    forwardRef(() => PostModule),
    forwardRef(() => VirtualProjectModule),
    forwardRef(() => UserModule),
    forwardRef(() => StripeModule),
    UploadModule,
    // UserModule,
    // UniversityModule,
    // CompanyModule,
    // StripeModule,
  ],
  providers: [AuthService, JwtStrategy, RefreshJwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
