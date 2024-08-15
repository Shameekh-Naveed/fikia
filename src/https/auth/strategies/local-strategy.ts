// import {
//   HttpException,
//   HttpStatus,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy } from 'passport-local';
// import { AuthService } from '../auth.service';

// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//   constructor(private authService: AuthService) {
//     super();
//   }

//   async validate(username: string, password: string) {
//     console.log("heheheheheheheree ");
//     const user = await this.authService.validateUser(username, password);
//     if (!user)
//       throw new HttpException(
//         'Invalid credentials (email)',
//         HttpStatus.UNAUTHORIZED,
//       );
//     return user;
//   }
// }
