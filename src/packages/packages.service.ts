import { Injectable } from '@nestjs/common';
import {
  CompanyCounts,
  CompanyPackage,
  Package,
  StudentCounts,
  UniversityPackage,
} from './package.class';
import { StripeService } from 'src/https/stripe/stripe.service';

@Injectable()
export class PackagesService {
  private readonly packages: (UniversityPackage | CompanyPackage)[] = [
    new UniversityPackage('prod_PX3Hos1JNm1Lmm', 'UL1', StudentCounts.Red),
    new UniversityPackage('prod_PX7hAKDR8Umpsb', 'UL2', StudentCounts.Orange),
    new UniversityPackage('prod_PX7iroogREHqMT', 'UL3', StudentCounts.Light),
    new UniversityPackage('prod_PX7iQn2cE4mWCH', 'UL4', StudentCounts.Green),
    new UniversityPackage('prod_PrU6QMtnQQTLYQ', 'UL0', StudentCounts.Red),

    new CompanyPackage(
      'prod_PX7m209d2fQSE9',
      'CL1',
      CompanyCounts.Red,
      CompanyCounts.Orange,
      CompanyCounts.Green,
    ),
    new CompanyPackage(
      'prod_PX7nL1wdjsnFpw',
      'CL2',
      CompanyCounts.Light,
      CompanyCounts.Orange,
      CompanyCounts.Green,
    ),
    new CompanyPackage(
      'prod_PX7nLKYTZXRQR5',
      'CL3',
      CompanyCounts.Light,
      CompanyCounts.Orange,
      CompanyCounts.Green,
    ),
  ];

  create(createPackageDto: string) {
    return 'This action adds a new package';
  }

  findAll() {
    return `This action returns all packages`;
  }

  findOne<T extends Package>(id: string): T | undefined {
    return this.packages.find((p) => p.id == id) as unknown as T | undefined;
  }

  findOne_Name<T extends Package>(name: string): T | undefined {
    return this.packages.find((p) => p.name === name) as unknown as
      | T
      | undefined;
  }

  update(id: number, updatePackageDto: string) {
    return `This action updates a #${id} package`;
  }

  remove(id: number) {
    return `This action removes a #${id} package`;
  }
}
