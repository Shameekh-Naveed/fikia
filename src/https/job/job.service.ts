import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId } from 'mongoose';
import { Job } from 'src/db/schemas/job.schema';
import { JobStatus } from 'src/enums/job-status.enum';
import { Company } from 'src/db/schemas/company.schema';
import { Interval } from 'src/enums/interval.enum';
import { UserService } from '../user/user.service';
import { Application } from 'src/db/schemas/application.schema';
import { UserRole } from 'src/enums/user-role.enum';

@Injectable()
export class JobService {
  constructor(
    @InjectModel('Job') private readonly jobModel: Model<Job>,
    @InjectModel('Application')
    private readonly applicationModel: Model<Application>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
  async create(userID: ObjectId, createJobDto: CreateJobDto) {
    const {
      location,
      description,
      title,
      venue,
      type,
      companyID,
      level,
      industry,
      qualification,
      responsibilities,
      minSalary,
      maxSalary,
    } = createJobDto;

    if (minSalary > maxSalary)
      throw new BadRequestException(
        'Minimum salary cannot be greater than maximum salary',
      );

    const job = new this.jobModel({
      location,
      description,
      title,
      userID,
      companyID,
      venue,
      type,
      level,
      industry,
      qualification,
      responsibilities,
      minSalary,
      maxSalary,
    });
    await job.save();
    return job._id;
  }

  findAll(page: number, limit: number, companyID: ObjectId) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;
    return this.jobModel
      .find({ companyID })
      .skip(start)
      .limit(maxLimit)
      .populate({
        path: 'userID',
        select: '_id firstName lastName email profilePicture',
      })
      .populate({
        path: 'approvingUnis',
        select: '_id name logo',
      });
  }

  async allJobIDs(filter: { [key: string]: any }) {
    const jobs = await this.jobModel.find(filter).select('_id');
    const jobIDs = jobs.map((job) => job._id);
    return jobIDs;
  }

  async search(
    page: number,
    limit: number,
    title: string,
    userUni: ObjectId,
    userID: ObjectId,
    interval?: Interval | null,
  ) {
    const MaxLimit = limit;
    const skip = (page - 1) * MaxLimit;
    const words = title.split(/\s+/);
    // Regex pattern for case-insensitive matching
    const regexPattern = words.map((word) => new RegExp(word, 'i'));

    const createdAtFilter = this.getCreatedAtFilter(interval);

    const user = await this.userService.findOne(userID);
    const savedJobs = user.studentDetails?.savedJobs;

    const jobs = await this.jobModel
      .find({
        title: regexPattern,
        approvingUnis: userUni,
        ...createdAtFilter,
      })
      .select('-approvingUnis')
      .skip(skip)
      .limit(MaxLimit)
      .populate({
        path: 'companyID',
        select: '_id name logo description employeeCount',
      });

    const applications = await this.getApplications(
      userID,
      jobs.map((job) => job._id),
    );
    const output = jobs.map((job) => {
      const relevantApplication = applications.filter(
        (application) => application.jobID.toString() === job._id.toString(),
      )[0];
      const saved = savedJobs?.includes(job._id);
      return {
        ...job.toObject(),
        saved,
        applicationStatus: relevantApplication?.stage || null,
      };
    });

    return output;
  }

  private async getApplications(userID: ObjectId, jobIDs: ObjectId[]) {
    const applications = await this.applicationModel
      .find({ userID, jobID: { $in: jobIDs } })
      .select('jobID stage');
    return applications;
  }

  private getCreatedAtFilter(interval: Interval | null) {
    if (!interval) return {};
    const date = new Date();
    switch (interval) {
      case Interval.DAY:
        date.setDate(date.getDate() - 1);
        break;
      case Interval.MONTH:
        date.setMonth(date.getMonth() - 1);
        break;
      case Interval.YEAR:
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    return { createdAt: { $gte: date } };
  }

  async findOne(
    id: ObjectId,
    user?: {
      _id: ObjectId;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      phoneNumber: string;
      profilePicture: string;
    },
  ) {
    const job = await this.jobModel
      .findById(id)
      .populate({
        path: 'viewers',
        select: '_id',
      })
      .populate('companyID');
    if (!job) throw new BadRequestException('Job not found');
    let viewer_array = job.toObject()?.viewers;
    let index = 0;
    if (user?.role === UserRole.STUDENT) {
      if (viewer_array&& viewer_array.length) {
        viewer_array.findIndex((item) => {
          if (item['_id'].toString() === user._id) {
            index = 1;
            return 1;
          }
        });
      }
      if (index === -1 || index === 0) {
        // If the viewerId is not found in the viewers array, add it
        job.viewers.push(user._id);

        // Save the updated job object back to the database
        const updatedJob = await job.save();

        return updatedJob;
      }
    }
    return job;
  }

  async approveJob(jobID: ObjectId, uniID: ObjectId) {
    const job = await this.jobModel.findByIdAndUpdate(jobID, {
      $addToSet: { approvingUnis: uniID },
    });

    return 'Success';
  }

  async countJobs(companyID: ObjectId) {
    const count = await this.jobModel.countDocuments({ companyID });
    return count;
  }

  update(id: number, updateJobDto: UpdateJobDto) {
    return `This action updates a #${id} job`;
  }

  remove(id: number) {
    return `This action removes a #${id} job`;
  }
}
