import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateVirtualProjectDto } from './dto/create-virtual-project.dto';
import { UpdateVirtualProjectDto } from './dto/update-virtual-project.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { VirtualProject, Task } from 'src/db/schemas/virtualProject.schema';
import {
  Task as ApplicantTask,
  VirtualProjectApplicant,
} from 'src/db/schemas/virtualProjectApplicant.schema';
import { UserRole } from 'src/enums/user-role.enum';
import { User } from 'src/db/schemas/user.schema';
import { AssignGradeDto } from './dto/assign-grade.dto';
import { JobStatus } from 'src/enums/job-status.enum';
import { isCompanyManager } from 'src/utils/misc';
import { UserService } from '../user/user.service';

type UserSubset = Partial<
  Pick<
    User,
    | '_id'
    | 'firstName'
    | 'lastName'
    | 'profilePicture'
    | 'role'
    | 'studentDetails'
  >
>;
@Injectable()
export class VirtualProjectService {
  constructor(
    @InjectModel('VirtualProject')
    private readonly virtualProjectModel: Model<VirtualProject>,
    @InjectModel('VirtualProjectApplicant')
    private readonly applicantModel: Model<VirtualProjectApplicant>,

    private readonly userService: UserService,
  
  ) {}

  async create(
    createVirtualProjectDto: CreateVirtualProjectDto,
    userID: ObjectId,
  ) {
    // const {
    //   title,
    //   overview,
    //   time,
    //   difficulty,
    //   organizationID,
    //   venue,
    //   type,
    //   level,
    //   industry,
    //   qualification,
    // } = createVirtualProjectDto;

    const {
      title,
      overview,
      difficulty,
      organizationID,
      thumbnail,
      introVid,
      estimatedDuration,
      industryType,
    } = createVirtualProjectDto;

    const tasks: Task[] = createVirtualProjectDto.tasks.map((task) => {
      return {
        name: task.name,
        description: task.description,
        time: task.time,
        requiredSubmissions: task.requiredSubmissions,
        explanatoryVid: task.explanatoryVid,
        attachments: task.attachments,
        requiredSubmission: task.requiredSubmissions,
        duration: task.duration,
      };
    });

    const virtualProject = new this.virtualProjectModel({
      title,
      overview,
      difficulty,
      organizationID,
      thumbnail,
      introVid,
      estimatedDuration,
      industryType,
      tasks,
      recruiter: userID,
    });
    await virtualProject.save();
    return virtualProject._id;
  }

  async findAll(page: number, limit: number, uniID: ObjectId) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;
    const projects = await this.virtualProjectModel
      .find({ approvingUnis: new Types.ObjectId(uniID.toString()) })
      .skip(start)
      .limit(maxLimit)
      .populate('organizationID');

    return projects;
  }

  async findAllCompany(page: number, limit: number, companyID: ObjectId) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;
    const projects = await this.virtualProjectModel.aggregate([
      {
        $match: { organizationID: new Types.ObjectId(companyID.toString()) },
      },
      {
        $lookup: {
          from: 'virtualprojectapplicants',
          localField: '_id',
          foreignField: 'projectID',
          as: 'applications',
        },
      },
      {
        $lookup: {
          from: 'universities', // Name of the university collection
          localField: 'approvingUnis',
          foreignField: '_id',
          as: 'universities',
        },
      },
      {
        $unwind: {
          path: '$universities', // Deconstruct the universities array
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          organizationID: 1,
          status: 1,
          title: 1,
          totalApplications: { $size: '$applications' },
          createdAt: 1,
          approvingUnis: 1,
          universities: 1,
          completedApplications: {
            $sum: {
              $cond: {
                if: { $eq: ['$applications.status', true] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $skip: start,
      },
      {
        $limit: maxLimit,
      },
    ]);

    return projects;
  }

  async findAllUni(page: number, limit: number, uniID: ObjectId) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;
    // TODO: Test this please

    const projects = await this.virtualProjectModel.aggregate([
      {
        $lookup: {
          from: 'virtualprojectapplicants',
          localField: '_id',
          foreignField: 'projectID',
          as: 'applications',
        },
      },
      {
        $unwind: '$applications', // Unwind the applications array for further processing
      },
      {
        $lookup: {
          from: 'users',
          localField: 'applications.userID',
          foreignField: '_id',
          as: 'applications.user',
        },
      },
      {
        $match: {
          'applications.user.studentDetails.university': new Types.ObjectId(
            uniID.toString(),
          ),
        },
      },
      {
        $group: {
          _id: '$_id', // Group by project ID
          organizationID: { $first: '$organizationID' },
          totalApplications: { $sum: 1 },
          title: { $first: '$title' },
          status: { $first: '$status' },
          completedApplications: {
            $sum: {
              $cond: {
                if: { $eq: ['$applications.status', true] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $skip: start,
      },
      {
        $limit: maxLimit,
      },
    ]);

    return projects;
  }

  async getApplicants(id: ObjectId, uniID: ObjectId, companyID: ObjectId) {
    const project = await this.virtualProjectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');
    if (companyID && project.organizationID != companyID)
      throw new UnauthorizedException('You do not own this project');
    let applicants: VirtualProjectApplicant[] = [];
    if (companyID)
      applicants = await this.applicantModel
        .find({ projectID: id })
        .populate('userID');
    else
      applicants = await this.applicantModel
        .find({ projectID: id })
        .populate({ path: 'userID', match: { universityID: uniID } });

    return applicants;
  }

  async getApplicant(
    id: ObjectId,
    role: UserRole | string,
    userID: ObjectId,
    uniID: ObjectId,
    companyID: ObjectId,
  ) {
    const applicant = await this.applicantModel
      .findById(id)
      // .populate<{ userID: UserSubset }>('userID');
      .populate<{ userID: UserSubset }>({
        path: 'userID',
        select:
          '_id firstName lastName profilePicture role studentDetails.university',
      });
    if (!applicant) throw new NotFoundException('Applicant not found');

    if (isCompanyManager(role as UserRole)) {
      const project = await this.virtualProjectModel.findById(
        applicant.projectID,
      );
      if (!project) throw new NotFoundException('Project not found');
      if (project.organizationID != companyID)
        throw new UnauthorizedException('You do not own this project');
    } else if (
      role === UserRole.UNI_ADMIN &&
      applicant.userID.studentDetails.university != uniID
    )
      throw new UnauthorizedException('You do not own this applicant');
    else if (role === UserRole.STUDENT && applicant.userID._id != userID)
      throw new UnauthorizedException(
        'You can only view your own applications',
      );

    return applicant;
  }

  async assignGrade(
    id: ObjectId,
    data: AssignGradeDto,
    companyID: ObjectId,
    userID: ObjectId,
  ) {
    const applicant = await this.applicantModel
      .findById(id)
      .populate<{ projectID: VirtualProject }>('projectID');
    if (!applicant) throw new NotFoundException('Applicant not found');
    if (applicant.projectID.organizationID != companyID)
      throw new UnauthorizedException('You can not grade this application');
    // if (applicant.userID.studentDetails.university != uniID)
    //   throw new UnauthorizedException('You do not own this applicant');
    const task = applicant.tasks.find((task) => task.taskID == data.taskID);
    if (!task) throw new NotFoundException('Task not found');
    if (!task.status)
      throw new BadRequestException('Task not yet submitted for grading');
    task.grade = data.grade;
    applicant.history.push({
      changedField: `Graded TASK: ${task._id}`,
      updatedValue: `${data.grade}`,
      userID,
      updateTime: new Date(),
    });
    await applicant.save();
    return 'Success';
  }

  async findOne(
    id: ObjectId,
    uniID: ObjectId,
    userRole: string,
    userID: ObjectId,
    companyID: ObjectId,
  ) {
    const project = await this.virtualProjectModel
      .findById(id)
      .populate<{ organizationID: VirtualProject }>('organizationID');

    if (!project) throw new NotFoundException('Project not found');
    if (
      isCompanyManager(userRole as UserRole) &&
      project.organizationID._id != companyID
    )
      throw new UnauthorizedException('You do not own this project');
    if (userRole == UserRole.STUDENT && !project.approvingUnis.includes(uniID))
      throw new UnauthorizedException(
        'Your university has not approved this job',
      );

    if (isCompanyManager(userRole as UserRole)) return project;
    else if (userRole == UserRole.UNI_ADMIN) {
      const projectCopy = project.toObject();
      delete projectCopy.approvingUnis;
      return projectCopy;
    }

    const projectCopy = project.toObject();
    delete projectCopy.approvingUnis;

    const projectProgressDetails = await this.applicantModel.findOne({
      userID: userID,
      projectID: id,
    });
    if (!projectProgressDetails) return project;

    const completed = projectProgressDetails.tasks.filter(
      (task) => task.status,
    ).length;
    const total = project.tasks.length;

    return { project, projectProgressDetails, completed, total };
  }

  async findAndExpire(time: Date) {
    const projects = await this.virtualProjectModel.updateMany(
      { createdAt: { $lt: time }, status: { $ne: JobStatus.EXPIRED } },
      { $set: { status: JobStatus.EXPIRED } },
    );
    console.log({ projects });
    return 'success';
  }

  async countActiveProjects(companyID: ObjectId) {
    const count = await this.virtualProjectModel.countDocuments({
      organizationID: companyID,
      status: JobStatus.ACTIVE,
    });
    return count;
  }

  async findInProgress(page: number, limit: number, userID: ObjectId) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;
    const projects = await this.applicantModel
      .find({ userID })
      .skip(start)
      .limit(maxLimit)
      .populate<{ projectID: VirtualProject }>({
        path: 'projectID',
        select: '_id title time status organizationID difficulty tasks',
      });
    const projectsWithProgress = projects.map((project) => {
      const completed = project.tasks.filter((task) => task.status).length;
      const total = project.projectID.tasks.length;
      return {
        _id: project._id,
        jobID: project.projectID._id,
        title: project.projectID.title,
        estimatedDuration: project.projectID.estimatedDuration,
        status: project.projectID.status,
        organizationID: project.projectID.organizationID,
        difficulty: project.projectID.difficulty,
        completed,
        total,
      };
    });
    return projectsWithProgress;
  }

  async apply(projectID: ObjectId, userID: ObjectId) {
    // TODO: Possibly check if user can apply to this project
    // const project = await this.virtualProjectModel.findById(projID);
    // if (project.assignedTo)
    //   throw new BadRequestException('Project already assigned to someone');
    // project.assignedTo = userID;
    // await project.save();
    // return 'Successfully applied';
    const application = new this.applicantModel({
      userID,
      projectID,
    });
    await application.save();
    return application._id;
  }

  async submitTask(
    projectID: ObjectId,
    taskID: ObjectId,
    userID: ObjectId,
    submissions: string[],
  ) {
    const applicant = await this.applicantModel.findOne({
      projectID,
      userID,
    });

    const project = await this.virtualProjectModel.findById(projectID);
    const requiredTask = project.tasks.find((task) => task._id == taskID);

    if (!applicant)
      throw new BadRequestException('You are not assigned to this project');

    let task = applicant.tasks.find((task) => task.taskID == taskID);

    if (!task) {
      const newTask: ApplicantTask = {
        taskID,
        status: false,
        submissions: [],
      };
      task = newTask;
      applicant.tasks.push(newTask);
    } else {
      if (task.status) {
        throw new BadRequestException('Task already submitted');
      }
      if (task.submissions.length === requiredTask.requiredSubmissions) {
        throw new BadRequestException(
          'You have already submitted the maximum number of submissions',
        );
      }
    }
    console.log({ task });

    if (
      requiredTask.requiredSubmissions <
      task.submissions.length + submissions.length
    ) {
      throw new BadRequestException(
        'You are submitting more than the required number of submissions',
      );
    }

    task.submissions.push(...submissions);

    if (task.submissions.length == requiredTask.requiredSubmissions) {
      task.status = true;
    }

    const trueTasks = applicant.tasks.filter((task) => task.status).length;

    if (trueTasks === project.tasks.length) {
      applicant.status = true;
      applicant.submissionDate = new Date();
    }

    await applicant.save();

    return 'Success';
  }

  async submissionProfile(submissionID: ObjectId, companyID: ObjectId) {
    const submission = await this.applicantModel
      .findById(submissionID)
      .populate<{ projectID: VirtualProject }>('projectID');

    if (!submission) throw new NotFoundException('Submission not found');

    if (submission.projectID.organizationID.toString() !== companyID.toString())
      throw new UnauthorizedException(
        'Sorry you are not authorized to view this application',
      );

    const userProfile = await this.userService.getStudentProfile(
      submission.userID,
    );
    return { submission, profile: userProfile };
  }

  async approve(id: ObjectId, uniID: ObjectId) {
    const project = await this.virtualProjectModel.findByIdAndUpdate(id, {
      $addToSet: { approvingUnis: uniID },
    });
    return 'Success';
  }

  async getStats(companyID: ObjectId) {
    const allProjects = await this.virtualProjectModel
      .find({
        organizationID: new Types.ObjectId(companyID.toString()),
      })
      .select('_id');
    const projectIDs = allProjects.map((project) => project._id.toString());
    const totalProjects = allProjects.length;

    const activeProjects = await this.virtualProjectModel.countDocuments({
      organizationID: new Types.ObjectId(companyID.toString()),
      status: JobStatus.ACTIVE,
    });

    const expiredProjects = await this.virtualProjectModel.countDocuments({
      organizationID: new Types.ObjectId(companyID.toString()),
      status: JobStatus.EXPIRED,
    });

    const totalApplications = await this.applicantModel.countDocuments({
      projectID: { $in: projectIDs },
    });

    const completedApplications = await this.applicantModel.countDocuments({
      projectID: { $in: projectIDs },
      status: true,
    });

    return {
      totalProjects,
      activeProjects,
      expiredProjects,
      totalApplications,
      completedApplications,
    };
  }

  async topUnis(
    companyID: ObjectId,
    userID: ObjectId,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const filter = { organizationID: companyID };
    if (userID) filter['recruiter'] = userID;
    const allProjects = await this.virtualProjectModel
      .find(filter)
      .select('_id');

    const allProjectIDs = allProjects.map((project) => project._id);

    const topUnis = await this.applicantModel.aggregate([
      {
        $match: {
          projectID: { $in: allProjectIDs },
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

  async completedProjects(
    companyID: ObjectId,
    userID: ObjectId,
    page: number,
    limit: number,
  ) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;

    const filter = { organizationID: new Types.ObjectId(companyID.toString()) };
    if (userID) filter['recruiter'] = userID;

    const allProjects = await this.virtualProjectModel
      .find(filter)
      .select('_id');

    let projectIDs = allProjects.map(
      (project) => new Types.ObjectId(project._id.toString()),
    );


    // Get recent completed projects
    const applications = await this.applicantModel.aggregate([
      {
        $match: {
          projectID: { $in: projectIDs },
          status: true,
        },
      },
      {
        $sort: { submissionDate: -1 },
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
          projectID: 1,
          userID: 1,
          grade: 1,
          createdAt: 1,
          university: '$university.name',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          profilePicture: '$user.profilePicture',
          submissionDate: 1,
        },
      },
    ]);
    console.log(applications)
    return applications;
  }

  async submissionInMonth(
    companyID: ObjectId,
    userID: ObjectId,
    month: number,
    year: number,
  ) {
    const filter = { organizationID: companyID };
    if (userID) filter['recruiter'] = userID;
    const projects = await this.virtualProjectModel.find(filter).select('_id');

    const projectIDs = projects.map((project) => project._id);

    // * Get the number of applications each day of the month
    const applicationsByDay = await this.applicantModel.aggregate([
      {
        $match: {
          projectID: { $in: projectIDs },
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

    const completed = await this.applicantModel.aggregate([
      {
        $match: {
          projectID: { $in: projectIDs },
          status: true,
          submissionDate: {
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

    return { applicationsByDay, completed };
  }

  async issueCertificate(
    submissionID: ObjectId,
    companyID: ObjectId,
    url: string,
  ) {
    const submission = await this.applicantModel
      .findById(submissionID)
      .populate<{ projectID: VirtualProject }>('projectID');

    if (!submission) throw new NotFoundException('Submission not found');

    if (submission.projectID.organizationID.toString() !== companyID.toString())
      throw new UnauthorizedException(
        'Sorry you are not authorized to issue a certificate for this application',
      );

    // TODO: Send certificate to user, maybe via email or something

    return 'Success';
  }

  update(id: number, updateVirtualProjectDto: UpdateVirtualProjectDto) {
    return `This action updates a #${id} virtualProject`;
  }

  remove(id: number) {
    return `This action removes a #${id} virtualProject`;
  }
}
