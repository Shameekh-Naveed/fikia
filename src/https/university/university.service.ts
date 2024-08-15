import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { Model, Mongoose, ObjectId, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { University } from 'src/db/schemas/university.schema';
import { UserService } from '../user/user.service';
import { Status } from 'src/enums/status.enum';
import { AuthService } from '../auth/auth.service';
import { ApplicationService } from '../application/application.service';
import { EventService } from '../event/event.service';
import { ApprovedStudent } from 'src/db/schemas/approvedStudent.schema';

@Injectable()
export class UniversityService {
  constructor(
    @InjectModel('University') private universityModel: Model<University>,
    @InjectModel('ApprovedStudent')
    private approvedStudentModel: Model<ApprovedStudent>,
    private readonly applicationService: ApplicationService,
    // @Inject(forwardRef(() => EventService))
    private readonly eventsService: EventService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async create(
    createUniversityDto: CreateUniversityDto,
    studentsData: ApprovedStudent[],
    userID: ObjectId,
  ) {
    const { name, tagline, description, logo, email, coverPicture } =
      createUniversityDto;

    const uni = new this.universityModel({
      name,
      tagline,
      description,
      logo,
      email,
      coverPicture,
      owner: userID,
    });

    const students: ApprovedStudent[] = studentsData.map((student) => ({
      ...student,
      universityID: uni._id,
    }));
    this.validateStudentsData(students);

    const existingUni = await this.universityModel.findOne({ email });
    if (existingUni)
      throw new BadRequestException(
        'University with this email already exists',
      );

    const uniID = uni._id.toString();

    const checkAndAssignUser = await this.userService.checkAndAssignUser(
      userID,
      uniID,
    );
    if (!checkAndAssignUser)
      throw new InternalServerErrorException(
        'Error while assigning user to university',
      );
    await uni.save();
    const updatedToken = await this.authService.updateToken(userID);

    if (students.length > 0)
      await this.approvedStudentModel.insertMany(students);
    return { uniID: uni._id, updatedToken };
  }

  findAll(name: string) {
    const filter = {};
    if (name) filter['name'] = { $regex: name, $options: 'i' };
    return this.universityModel.find(filter);
  }

  async getApprovedStudents(universityID: ObjectId) {
    const students = await this.approvedStudentModel.find({ universityID });
    if (!students) throw new NotFoundException('No students found');
    return students;
  }

  async addApprovedStudents(
    universityID: ObjectId,
    studentsData: ApprovedStudent[],
  ) {
    this.validateStudentsData(studentsData);

    console.log({ universityID });

    const students: ApprovedStudent[] = studentsData.map((student) => ({
      ...student,
      universityID,
    }));

    await this.approvedStudentModel.insertMany(students);
    return 'Students added successfully';
  }

  validateStudentsData(studentsData: ApprovedStudent[]) {
    const invalidData = studentsData.filter(
      (student) =>
        !student.firstName ||
        !student.dateOfBirth ||
        !student.email ||
        !student.id,
    );

    const ids = invalidData.map((student) => student.id).join(', ');

    if (invalidData.length > 0)
      throw new BadRequestException(
        `Invalid data in students data file. Please check the following IDs: ${ids}`,
      );
  }

  async getStudentsData(universityID: ObjectId) {
    const studentsStats = await this.userService.getStudentsStats(universityID);

    const jobCount =
      await this.applicationService.getApplicationCount(universityID);

    const loginFrequency =
      await this.userService.getLoginFrequency(universityID);

    const eventCount = await this.eventsService.eventCount(universityID);

    return { ...studentsStats, jobCount, loginFrequency, eventCount };
  }

  async getStudentsDataDetail(universityID: ObjectId) {
    const studentsStats =
      await this.userService.getStudentDetailByUniversity(universityID);
    const verify = await Promise.all(
      studentsStats.map(async (item) => {
        const result =
          await this.applicationService.calculateApplicationDataAgainstUser(
            item._id,
          );
        return {
          ...item,
          ...result,
        };
      }),
    );
    return verify;
  }

  findAllApproved() {
    return this.universityModel.find({ status: Status.APPROVED });
  }

  async findOne(id: ObjectId) {
    const uni = await this.universityModel.findById(id);
    if (!uni) throw new NotFoundException('University not found');
    return uni;
  }

  async _findOne_(id: ObjectId) {
    return await this.universityModel.findById(id);
  }

  findPackage(uniID: ObjectId) {
    return this.universityModel.findById(uniID).select('packageID');
  }

  async update(
    id: ObjectId | Types.ObjectId,
    updateUniversityDto: UpdateUniversityDto,
  ) {
    const { status } = updateUniversityDto;
    console.log({ id, status });
    const uni = await this.universityModel.findByIdAndUpdate(
      id,
      { status },
      {
        new: true,
      },
    );
    const user = await this.userService.changeUniModStatus(uni.owner, status);

    return 'Success';
  }

  remove(id: number) {
    return `This action removes a #${id} university`;
  }
}
