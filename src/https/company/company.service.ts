import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Company } from 'src/db/schemas/company.schema';
import { UserService } from '../user/user.service';
import { Status } from 'src/enums/status.enum';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel('Company') private companyModel: Model<Company>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    const {
      name,
      description,
      logo,
      owner,
      employeeCount,
      companyEnvironment,
    } = createCompanyDto;
    const company = new this.companyModel({
      name,
      description,
      logo,
      owner,
      employeeCount,
      companyEnvironment,
    });
    const companyID = company._id.toString();
    await this.userService.checkAndAssignCompany(owner, companyID);
    await company.save();
    return companyID;
  }

  async search(
    page: number,
    limit: number,
    name?: string,
    employeeCount?: number,
  ) {
    const MaxLimit = limit;
    const skip = (page - 1) * MaxLimit;
    const words = name.split(/\s+/);
    // Create a regular expression pattern for case-insensitive matching
    const regexPattern = words.map((word) => new RegExp(word, 'i'));

    const companies = await this.companyModel
      .find({
        name: regexPattern,
        status: Status.APPROVED,
        employeeCount: { $gte: employeeCount || 0 },
      })
      .select('name descritpion logo employeeCount createdAt')
      .skip(skip)
      .limit(MaxLimit);

    return companies;
  }

  async addCompanyEnvironment(id: ObjectId, companyEnvironment: string[]) {
    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { $push: { companyEnvironment } },
      { new: true },
    );
    return company;
  }

  async findOne(id: ObjectId) {
    const company = await this.companyModel.findById(id);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async _findOne_(id: ObjectId) {
    return await this.companyModel.findById(id);
  }

  async findCompanies(companyIDs: Set<ObjectId>) {
    const companies = await this.companyModel.find({
      _id: { $in: companyIDs },
    });
    return companies;
  }

  findPackage(companyID: ObjectId) {
    return this.companyModel.findById(companyID).select('packageID');
  }

  async update(id: ObjectId, updateCompanyDto: UpdateCompanyDto) {
    const { status } = updateCompanyDto;
    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { status },
      {
        new: true,
      },
    );
    const user = await this.userService.changeCompanyModStatus(
      company.owner,
      status,
    );
    return 'Success';
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}
