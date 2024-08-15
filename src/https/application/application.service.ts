import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, ObjectId, Types } from 'mongoose';
import { Application } from 'src/db/schemas/application.schema';
import { ApplicationStatus } from 'src/enums/application-status.enum';
import { JobService } from '../job/job.service';
import { Job } from 'src/db/schemas/job.schema';
import { ShortlistApplicationDto } from './dto/shortlist-application.dto';
import { InterviewApplicationDto } from './dto/interview-application.dto';
import { UserService } from '../user/user.service';
import { JobStatus } from 'src/enums/job-status.enum';
import { User } from 'src/db/schemas/user.schema';
import { populate } from 'dotenv';
import { UserRole } from 'src/enums/user-role.enum';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel('Application')
    private readonly applicationModel: Model<Application>,
    @InjectModel('Job')
    private readonly jobModel:Model<Job>,
    private readonly jobService: JobService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
  async create(createApplicationDto: CreateApplicationDto) {
    const { jobID, userID, resume, rating } = createApplicationDto;
    const application = new this.applicationModel({
      jobID,
      userID,
      resume,
      rating,
    });
    await application.save();
    await this.jobModel.findByIdAndUpdate(
      jobID,
      { $inc: { applicants: 1 } }, // Increment applicants count by 1
      { new: true } // Return the updated document
    );
    return application._id;
  }

  async removeUserApplications(userID: ObjectId, session: ClientSession) {
    const applications = await this.applicationModel.deleteMany(
      { userID },
      { session },
    );
    if (applications) return true;
    else throw new InternalServerErrorException("Couldn't delete applications");
  }

  // Find number of students of a specific university who have applied to any job
  async getApplicationCount(universityID: ObjectId) {
    const applications = await this.applicationModel.countDocuments({
      'userID.studentDetails.university': universityID,
    });
    return applications;
  }

  async findOne(id: ObjectId, userID: ObjectId, companyID: ObjectId) {
    const application = await this.applicationModel
      .findById(id)
      .populate<{ jobID: Job }>('jobID', '-approvingUnis');

    if (!application) throw new NotFoundException("Couldn't find application");
    if (
      companyID &&
      application.jobID.companyID.toString() != companyID.toString()
    )
      throw new UnauthorizedException(
        'You are not authorized to view this application h',
      );
    else if (!companyID && application.userID.toString() != userID.toString())
      throw new NotFoundException(
        'You are not authorized to view this application',
      );

    if (companyID)
      await application.populate<{
        userID: User;
      }>(
        'userID',
        '-password -studentDetails.following -studentDetails.dislikedPosts -studentDetails.likedPosts -studentDetails.groups -studentDetails.savedEvents -studentDetails.followedCompanies -studentDetails.savedJobs',
      );

    return application;
  }

  async getCompleteApplication(userID: ObjectId, companyID: ObjectId) {
    console.log({ userID, companyID });
    const applications = await this.applicationModel.aggregate([
      {
        $match: { userID: new Types.ObjectId(userID.toString()) },
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobID',
          foreignField: '_id',
          as: 'job',
        },
      },
      {
        $unwind: '$job',
      },
      {
        $match: {
          'job.companyID': new Types.ObjectId(companyID.toString()),
        },
      },
      {
        $project: {
          jobID: '$job._id',
          title: '$job.title',
          resume: '$resume',
          rating: '$rating',
          stage: '$stage',
          shortlistDate: '$shortlistDate',
          interviewDate: '$interviewDate',
          interviewVenue: '$interviewVenue',
        },
      },
    ]);
    const studentDetails = await this.userService.getStudentProfile(userID);
    return { applications, studentDetails };
  }

  async findForJob(
    jobID: ObjectId,
    companyID: ObjectId,
    userID: ObjectId,
    role: UserRole,
  ) {
    if (role === UserRole.STUDENT) {
      const application = await this.studentApplication(jobID, userID);
      return application;
    }
    const applications = await this.companyApplications(jobID, companyID);
    return applications;
  }

  // * Get all applications for a specific job by a specific company
  async companyApplications(jobID: ObjectId, companyID: ObjectId) {
    const job = await this.jobService.findOne(jobID);
    if (job.companyID['_id'].toString() !== companyID.toString())
      throw new UnauthorizedException(
        "You are not authorized to view this job's applications",
      );
    const applications = await this.applicationModel.find({ jobID });

    if (!applications)
      throw new NotFoundException("Couldn't find any applications");
    return applications;
  }

  // * Get application for a specific job by a student
  async studentApplication(jobID: ObjectId, userID: ObjectId) {
    const application = await this.applicationModel.findOne({ jobID, userID });
    if (!application) throw new NotFoundException("Couldn't find application");
    return application;
  }

  async findForUser(userID: ObjectId) {
    return await this.applicationModel.find({ userID });
  }

  async find(
    page: number,
    limit: number,
    userID: ObjectId,
    companyID: ObjectId,
    stage?: ApplicationStatus,
  ) {
    const skip = (page - 1) * limit;
    const filters: any = {};
    if (stage) filters.stage = stage;

    const allPipelines = {
      findJobs: {
        $lookup: {
          from: 'jobs', // The name of the 'jobs' collection
          localField: 'jobID',
          foreignField: '_id',
          as: 'job',
        },
      },

      findStudents: {
        $lookup: {
          from: 'users',
          localField: 'userID',
          foreignField: '_id',
          as: 'user',
        },
      },

      unwindJobs: {
        $unwind: '$job',
      },

      unwindStudents: {
        $unwind: '$user',
      },

      matchCompany: {
        $match: {
          'job.companyID': new Types.ObjectId(companyID?.toString()),
        }
      },

      matchStudent: {
        $match: {
          userID: new Types.ObjectId(userID.toString()),
        },
      },

      projectStudent: {
        $project: {
          'user.password': 0,
          'user.phoneNumber': 0,
          'user.studentDetails': 0,
        },
      },
    };
    const requirdPipelines: any[] = [
      allPipelines.findJobs,
      allPipelines.unwindJobs,
    ];
    if (companyID) {
      requirdPipelines.push(allPipelines.matchCompany);
      requirdPipelines.push(allPipelines.findStudents);
      requirdPipelines.push(allPipelines.unwindStudents);
      requirdPipelines.push(allPipelines.projectStudent);
    } else requirdPipelines.unshift(allPipelines.matchStudent);
    
    const applications = this.applicationModel.aggregate(requirdPipelines);
    return applications;
  }

  async shortlist(id: ObjectId, userCompanyID: ObjectId, userID: ObjectId) {
    const shortlistDate = new Date().toISOString();

    const application = await this.applicationModel
      .findById(id)
      .populate<{ jobID: Job }>('jobID');
    if (application.jobID.companyID != userCompanyID)
      throw new UnauthorizedException(
        'You are not authorized to shortlist this application',
      );

    application.shortlistDate = new Date(shortlistDate);
    application.stage = ApplicationStatus.SHORT_LISTED;

    application.history.push({
      changedField: 'shortlistDate',
      updatedValue: shortlistDate,
      userID,
      updateTime: new Date(),
    });

    await application.save();
    return 'Successfully shortlisted';
  }

  async interview(
    id: ObjectId,
    interviewApplicationDto: InterviewApplicationDto,
    userCompanyID: ObjectId,
    userID: ObjectId,
  ) {
    const { interviewDate, interviewVenue } = interviewApplicationDto;
    const application = await this.applicationModel
      .findById(id)
      .populate<{ jobID: Job }>('jobID');
    if (application.jobID.companyID != userCompanyID)
      throw new UnauthorizedException(
        'You are not authorized to shortlist this application',
      );
    application.interviewDate = new Date(interviewDate);
    application.stage = ApplicationStatus.INTERVIEW;

    application.history.push({
      changedField: 'interviewDate',
      updatedValue: `${interviewDate}`,
      userID,
      updateTime: new Date(),
    });

    await application.save();
    return "Successfully updated application's interview details";
  }

  async rate(
    id: ObjectId,
    rating: number,
    userCompanyID: ObjectId,
    userID: ObjectId,
  ) {
    const application = await this.applicationModel
      .findById(id)
      .populate<{ jobID: Job }>('jobID');
    if (application.jobID.companyID != userCompanyID)
      throw new UnauthorizedException(
        'You are not authorized to shortlist this application',
      );
    application.rating = rating;
    // application.stage = ApplicationStatus.INTERVIEW;

    application.history.push({
      changedField: 'rating',
      updatedValue: `${rating}`,
      userID,
      updateTime: new Date(),
    });

    await application.save();
    return "Successfully updated application's interview details";
  }

  async reject(id: ObjectId, userCompanyID: ObjectId, userID: ObjectId) {
    const application = await this.applicationModel
      .findById(id)
      .populate<{ jobID: Job }>('jobID');
    if (application.jobID.companyID != userCompanyID)
      throw new UnauthorizedException(
        'You are not authorized to shortlist this application',
      );
    application.stage = ApplicationStatus.REJECTED;

    application.history.push({
      changedField: 'stage',
      updatedValue: ApplicationStatus.REJECTED,
      userID,
      updateTime: new Date(),
    });

    await application.save();
    return 'Successfully rejected application';
  }

  async getStats(userID: ObjectId) {
    const applications = await this.applicationModel.find({ userID });
    const stats = {
      total: applications.length,
      shortlisted: applications.filter(
        (application) => application.stage == ApplicationStatus.SHORT_LISTED,
      ).length,
      interviewed: applications.filter(
        (application) => application.stage == ApplicationStatus.INTERVIEW,
      ).length,
      rejected: applications.filter(
        (application) => application.stage == ApplicationStatus.REJECTED,
      ).length,
      hired: applications.filter(
        (application) => application.stage == ApplicationStatus.HIRED,
      ).length,
    };
    return stats;
  }

  async applicationGraph(userID: ObjectId) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Give the total number of applied jobs per month
    const applications = await this.applicationModel.find({ userID });
    const created = applications.reduce((acc, application) => {
      const month = monthNames[application.createdAt.getMonth()];
      if (!acc[monthNames[month]]) acc[monthNames[month]] = 1;
      else acc[monthNames[month]]++;
      return acc;
    }, {});

    const shortlisted = applications.reduce((acc, application) => {
      if (application.stage == ApplicationStatus.SHORT_LISTED) {
        const month = monthNames[application.createdAt.getMonth()];
        if (!acc[monthNames[month]]) acc[monthNames[month]] = 1;
        else acc[monthNames[month]]++;
      }
      return acc;
    }, {});

    const interviewed = applications.reduce((acc, application) => {
      if (application.stage == ApplicationStatus.INTERVIEW) {
        const month = monthNames[application.createdAt.getMonth()];
        if (!acc[monthNames[month]]) acc[monthNames[month]] = 1;
        else acc[monthNames[month]]++;
      }
      return acc;
    }, {});

    return { created, shortlisted, interviewed };
  }

  async getStatsCompany(companyID: ObjectId, recruiterID: ObjectId) {
    const jobFilter = {
      companyID,
    };
    if (recruiterID) jobFilter['userID'] = recruiterID;

    const jobIDs = await this.jobService.allJobIDs(jobFilter);

    const totalJobs = jobIDs.length;

    const totalApplications = await this.applicationModel.countDocuments({
      jobID: { $in: jobIDs },
    });

    const interviewApplications = await this.applicationModel.countDocuments({
      jobID: { $in: jobIDs },
      stage: ApplicationStatus.INTERVIEW,
    });

    const shortlistedApplications = await this.applicationModel.countDocuments({
      jobID: { $in: jobIDs },
      stage: ApplicationStatus.SHORT_LISTED,
    });

    const rejectedApplications = await this.applicationModel.countDocuments({
      jobID: { $in: jobIDs },
      stage: ApplicationStatus.REJECTED,
    });

    return {
      totalJobs,
      totalApplications,
      interviewApplications,
      shortlistedApplications,
      rejectedApplications,
    };
  }

  async topUnis(
    companyID: ObjectId,
    recruiterID: ObjectId,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const jobFilter = {
      companyID,
    };
    if (recruiterID) jobFilter['userID'] = recruiterID;

    const jobIDs = await this.jobService.allJobIDs(jobFilter);

    const topUnis = await this.applicationModel.aggregate([
      {
        $match: {
          jobID: { $in: jobIDs },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userID',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: '$user.studentDetails.university',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'universities',
          localField: '_id',
          foreignField: '_id',
          as: 'university',
        },
      },
      {
        $unwind: '$university',
      },
      {
        $project: {
          _id: 0,
          university: '$university.name',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);
    return topUnis;
  }

  async getApplications(companyID: ObjectId, page: number, limit: number) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;

    const jobIDs = await this.jobService.allJobIDs(companyID);

    const applications = await this.applicationModel.aggregate([
      {
        $match: {
          jobID: { $in: jobIDs },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: start,
      },
      {
        $limit: maxLimit,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userID',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'universities',
          localField: 'user.studentDetails.university',
          foreignField: '_id',
          as: 'university',
        },
      },
      {
        $unwind: '$university',
      },
      {
        $project: {
          _id: 1,
          jobID: 1,
          userID: 1,
          rating: 1,
          createdAt: 1,
          university: '$university.name',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          profilePicture: '$user.profilePicture',
        },
      },
    ]);

    return applications;
  }

  async applicationsMonth(
    companyID: ObjectId,
    month: number,
    year: number,
    recruiterID: ObjectId,
  ) {
    const jobFilter = {
      companyID,
    };
    if (recruiterID) jobFilter['userID'] = recruiterID;

    const jobIDs = await this.jobService.allJobIDs(jobFilter);

    // * Get the number of applications each day of the month
    const applicationsByDay = await this.applicationModel.aggregate([
      {
        $match: {
          jobID: { $in: jobIDs },
          createdAt: {
            $gte: new Date(year, month, 1),
            $lt: new Date(year, month + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          date: { $first: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]);

    const interviewed = await this.applicationModel.aggregate([
      {
        $match: {
          jobID: { $in: jobIDs },
          stage: ApplicationStatus.INTERVIEW,
          createdAt: {
            $gte: new Date(year, month, 1),
            $lt: new Date(year, month + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$submissionDate' },
          date: { $first: '$submissionDate' },
          count: { $sum: 1 },
        },
      },
    ]);

    return { applicationsByDay, interviewed };
  }

  remove(id: number) {
    return `This action removes a #${id} application`;
  }

  async calculateApplicationDataAgainstUser(id:ObjectId){
    // Query Application model to count applications for the current user
    const applicationCount = await this.applicationModel.countDocuments({
      userID: id,
    });

    // Query Application model to count applications with interview dates for the current user
    const interviewCount = await this.applicationModel.countDocuments({
      userID: id,
      stage: 'interview',
    });

    // Query Application model to count shortlisted applications for the current user
    const shortlistedCount = await this.applicationModel.countDocuments({
      userID: id,
      stage: 'short-listed',
    });

    return{
      jobsApplied:applicationCount,
      totalInterviews:interviewCount,
      shortListed:shortlistedCount,

    }
  }
}
