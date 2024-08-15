import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from 'src/db/schemas/user.schema';
import { UserRole } from 'src/enums/user-role.enum';
import { JwtPayload } from 'src/interfaces/jwt-payload';
import { Document, ObjectId, Schema } from 'mongoose';
import { Status } from 'src/enums/status.enum';
import { UniversityService } from '../university/university.service';
import { CompanyService } from '../company/company.service';
import { CompanyPackage, UniversityPackage } from 'src/packages/package.class';
import { StripeService } from '../stripe/stripe.service';
import { VirtualProjectService } from '../virtual-project/virtual-project.service';
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private jwtService: JwtService,
    private readonly stripeService: StripeService,
    // private uniService: UniversityService,
    // private companyService: CompanyService,
    // private stripeService: StripeService,
  ) {}

  async validateUser(email: string, passwordH: string) {
    const user = await this.userService.findOneWithEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(passwordH, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
    // const output = user.toObject();
    // delete output.password;

    // return output;
  }

  async getCompleteUserInfo(user: User) {
    // TODO: Figure out a way for this to not be type any
    // const organizationID =
    //   user.companyModDetails?.companyID || user.uniModDetails?.uniID || '';
    // let userPackage;
    // if (organizationID)
    //   userPackage = await this.stripeService.getSubscription(organizationID);

    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      uniID:
        user.uniModDetails?.uniID ||
        user.studentDetails.university ||
        undefined,
      companyID: user.companyModDetails?.companyID || undefined,
      status: user.status,
      companyModDetails: user.companyModDetails,
      // package: userPackage?.productID || undefined,
    };
  }

  async checkPackage(organizationID: ObjectId) {
    const userPackage =
      await this.stripeService.getSubscription(organizationID);
    if (!userPackage)
      throw new UnauthorizedException(
        'Your organization does not have a package. Kindly contact your organization admin to resolve this issue.',
      );

    const { productID, current_period_end } = userPackage;
    if (current_period_end * 1000 < Date.now())
      throw new UnauthorizedException(
        'Your organization does not have a package. Kindly contact your organization admin to resolve this issue.',
      );
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const organizationID =
      user.companyModDetails?.companyID ||
      user.uniModDetails?.uniID ||
      user.studentDetails?.university;

    // await this.checkPackage(organizationID);

    await this.userService.updateLastLogin(user._id);

    const roles = [user.role, user.status];

    const uni =
      (user.uniModDetails?.uniID as any) ||
      (user.studentDetails?.university as any) ||
      undefined;

    const uniID = uni?._id || undefined;

    const company = (user.companyModDetails?.companyID as any) || undefined;
    const companyID = company?._id || undefined;

    const payload: JwtPayload = {
      user: {
        _id: user._id as unknown as ObjectId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        uniID: uniID,
        companyID: companyID,
        // package: user.package,
      },
      roles,
    };

    const { sanitizedUser, universityName, companyName } =
      await this.sanitizeUser(user);

    return {
      user: sanitizedUser,
      universityName,
      companyName,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '1d' }),
    };
  }

  async sanitizeUser(
    user: Document<unknown, {}, User> &
      User &
      Required<{
        _id: Schema.Types.ObjectId;
      }>,
  ) {
    await user.populate(
      'companyModDetails.companyID uniModDetails.uniID studentDetails.university',
    );

    const output = user.toObject() as any;

    delete output.password;

    const universityName =
      output.studentDetails?.university?.name ||
      output.uniModDetails?.uniID?.name;
    const companyName = output.companyModDetails?.companyID?.name;

    if (output.role === UserRole.STUDENT) {
      output.studentDetails.university = output.studentDetails.university?._id;

      delete output.studentDetails.dislikedPosts;
      delete output.studentDetails.likedPosts;
      delete output.studentDetails.savedEvents;
      delete output.studentDetails.savedJobs;
      delete output.studentDetails.groups;
      delete output.studentDetails.followedCompanies;
    }
    if (
      output.role === UserRole.UNI_ADMIN ||
      output.role === UserRole.UNI_COUNSELOR
    ) {
      output.uniModDetails.uniID = output.uniModDetails?.uniID?._id;
    }
    if (
      output.role === UserRole.COMPANY_ADMIN ||
      output.role === UserRole.COMPANY_RECRUITER
    ) {
      output.companyModDetails.companyID =
        output.companyModDetails?.companyID?._id;
    }

    return { sanitizedUser: output, universityName, companyName };
  }

  async hashPassword(password: string) {
    const saltRounds = 5;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  }

  async updateToken(userID: ObjectId) {
    const user = await this.userService.findOne(userID);
    if (!user) throw new UnauthorizedException('Invalid Credentials');

    const roles = [user.role, user.status];

    const payload: JwtPayload = {
      user: {
        _id: user._id as unknown as ObjectId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        uniID: user.uniModDetails?.uniID || undefined,
        companyID: user.companyModDetails?.companyID || undefined,
        // package: completeInfo.package,
      },
      roles,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '1d' }),
    };
  }

  async refreshToken(user: User) {
    const payload = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        status: user.status,
      },
      role: [user.role, user.status],
    };
    if (user.role === UserRole.STUDENT)
      payload.role = [UserRole.STUDENT, user.status];

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
