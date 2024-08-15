import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JobService } from 'src/https/job/job.service';
import { StripeService } from 'src/https/stripe/stripe.service';
import { VirtualProjectService } from 'src/https/virtual-project/virtual-project.service';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { CompanyPackage, UniversityPackage } from 'src/packages/package.class';
import { PackagesService } from 'src/packages/packages.service';

@Injectable()
export class MaxJobsInterceptor implements NestInterceptor {
  constructor(
    private readonly jobService: JobService,
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

    const count = await this.jobService.countJobs(companyID);
    const maxJobs =
      this.packagesService.findOne<CompanyPackage>(productID).jobs;

    console.log({ maxJobs, count, productID });

    if (count >= maxJobs)
      throw new ForbiddenException(
        'You have reached the limit for your package',
      );

    return next.handle();
  }
}
