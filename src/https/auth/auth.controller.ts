import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt-auth.guard';
import { RefreshJwtStrategy } from './strategies/refreshToken.strategy';
import { CreateAuthDto } from './dto/create-auth.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserService } from '../user/user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeCutsom } from 'src/custom-pipes/parse-file.pipe';
import { FilterParameterPipe } from 'src/custom-pipes/filter-parameter.pipe';
import { UploadService } from '../upload/upload.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private uploadService: UploadService,
  ) {}

  @Get('validateEmail')
  async validateEmail(@Query('email') email: string) {
    return await this.userService.validateEmail(email);
  }

  @Post('login')
  async login(@Body() credentials) {
    const { email, password } = credentials;
    return await this.authService.login(email, password);
  }

  @Post('signup')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async registerUser(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile(new ParseFilePipeCutsom('image'))
    profilePicture: Express.Multer.File,
  ) {
    const { password } = createUserDto;
    const hashedPassword = await this.authService.hashPassword(password);
    createUserDto.password = hashedPassword;
    if (profilePicture) {
      const profilePictureURL =
        await this.uploadService.saveFile(profilePicture);
      createUserDto.profilePicture = profilePictureURL;
    }
    if(createUserDto.languages){
      const languages = createUserDto.languages.split(',');
      console.log({ languages });
      createUserDto.languages = languages;
    }
   
    const userID = await this.userService.create(createUserDto);
    return { _id: userID };
  }

  @UseGuards(RefreshJwtGuard)
  @Post('refresh')
  async refrshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }
}
