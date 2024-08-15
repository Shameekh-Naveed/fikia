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
import { VirtualProjectService } from 'src/https/virtual-project/virtual-project.service';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { CompanyPackage, UniversityPackage } from 'src/packages/package.class';
import { PackagesService } from 'src/packages/packages.service';

@Injectable()
export class MaxVirtualProjectsInterceptor implements NestInterceptor {
  constructor(
    // private readonly userService: UserService,
    private readonly virtualProjectsService: VirtualProjectService,
    private readonly packagesService: PackagesService,
    private readonly stripeService: StripeService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request: ExtendedRequest = context.switchToHttp().getRequest();
    const userID = request.user.user._id;
    const companyID = request.user.user.companyID;
    // const packageID = request.user.user.package;

    const userPackage = await this.stripeService.getSubscription(companyID);
    if (!userPackage) throw new ForbiddenException('You do not have a package');
    const { productID } = userPackage;

    console.log({userPackage});

    const count =
      await this.virtualProjectsService.countActiveProjects(companyID);
    const maxProjects =
      this.packagesService.findOne<CompanyPackage>(
        productID,
      ).virtualWorkProjects;

    console.log({ maxProjects, count, productID });

    if (count >= maxProjects)
      throw new ForbiddenException(
        'You have reached the limit for your package',
      );

    return next.handle();
  }
}
