import { ObjectId } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import Stripe from 'stripe';

export interface JwtPayload {
  user: {
    _id: ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole | string;
    phoneNumber: string;
    profilePicture: string;
    uniID?: ObjectId | undefined;
    companyID?: ObjectId | undefined;
  };
  roles: string[];
}
