import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { StripeService } from 'src/https/stripe/stripe.service';
import { UserService } from 'src/https/user/user.service';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { UniversityPackage } from 'src/packages/package.class';
import { PackagesService } from 'src/packages/packages.service';

@Injectable()
export class MaxStudentsInterceptor implements NestInterceptor {
  constructor(
    private readonly userService: UserService,
    private readonly packagesService: PackagesService,
    private readonly stripeService: StripeService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request: ExtendedRequest = context.switchToHttp().getRequest();
    const userID = request.user.user._id;
    const uniID = request.user.user.uniID;
    // const packageID = request.user.user.package;

    const userPackage = await this.stripeService.getSubscription(uniID);
    if (!userPackage) throw new ForbiddenException('You do not have a package');
    const { productID, current_period_end } = userPackage;
    console.log('End date: ', new Date(current_period_end * 1000));
    if (current_period_end * 1000 < Date.now())
      throw new ForbiddenException(
        'Your package has expired. Please renew your package',
      );

    const count = await this.userService.countApprovedStudents(uniID);
    const maxStudents =
      this.packagesService.findOne<UniversityPackage>(productID).maxStudents;

    console.log({ maxStudents, count });

    if (count >= maxStudents)
      throw new ForbiddenException(
        'You have reached the limit for your package',
      );

    return next.handle();
  }
}
