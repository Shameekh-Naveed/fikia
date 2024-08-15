import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Model,
  Mongoose,
  ObjectId,
  Schema as MongooseSchema,
  ClientSession,
  Types,
} from 'mongoose';
import { User } from 'src/db/schemas/user.schema';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { GroupService } from '../group/group.service';
import { UserRole } from 'src/enums/user-role.enum';
import { PostService } from '../post/post.service';
import { ApplicationService } from '../application/application.service';
import { CommentService } from '../comment/comment.service';
import { Status } from 'src/enums/status.enum';
import { UniModRole } from 'src/enums/uni-mod-role.enum';
import { CompanyService } from '../company/company.service';
import { Entity } from 'src/enums/entity.enum';
import { UniversityService } from '../university/university.service';
import { JobService } from '../job/job.service';
import { CreateSupport } from './dto/create-support.dto';
import { EmailService } from '../email/email.service';
import { isCompanyEntity } from 'src/utils/misc';
import { ApprovedStudent } from 'src/db/schemas/approvedStudent.schema';
import { University } from 'src/db/schemas/university.schema';
import { Company } from 'src/db/schemas/company.schema';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { Group } from 'src/db/schemas/group.schema';
import { Attachment } from 'src/db/schemas/attchment.schema';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class UserService {
  constructor(
    // private readonly postService: PostService,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Attachment') private attachmentModel: Model<Attachment>,
    @InjectModel('ApprovedStudent')
    private approvedStudentModel: Model<ApprovedStudent>,
    private readonly groupService: GroupService,
    private readonly applicationService: ApplicationService,
    private readonly commentService: CommentService,
    private readonly companyService: CompanyService,
    private readonly uniService: UniversityService,
    private readonly jobService: JobService,
    private readonly mailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      profilePicture,
      uniID,
      position,
    } = createUserDto;
    const user = await this.userModel.findOne({ email });
    if (user)
      throw new BadRequestException('User with this email already exists');

    const userDetails: any = {
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      profilePicture,
    };

    if (role === UserRole.UNI_ADMIN || role === UserRole.UNI_COUNSELOR)
      userDetails.uniModDetails = { uniID, position };
    else if (role === UserRole.STUDENT) {
      userDetails.studentDetails = {
        dateOfBirth: new Date(createUserDto.dateOfBirth),
        gender: createUserDto.gender,
        location: createUserDto.location,
        website: createUserDto.website,
        languages: createUserDto.languages,
        university: createUserDto.universityID,
      };
      const approvedStudent = await this.checkStudent(
        email,
        firstName,
        lastName,
        new Date(createUserDto.dateOfBirth),
      );
      if (approvedStudent) userDetails.status = Status.APPROVED;
    } else if (
      role === UserRole.COMPANY_ADMIN ||
      role === UserRole.COMPANY_RECRUITER
    )
      userDetails.companyModDetails = {
        companyID: createUserDto.companyID,
        position,
      };

    const saveUser = new this.userModel(userDetails);
    await saveUser.save();
    return saveUser._id;
  }

  findAll() {
    return `This action returns all user balalala`;
  }

  async checkStudent(
    email: string,
    firstName: string,
    lastName: string,
    dateOfBirth: Date,
  ) {
    const student = await this.approvedStudentModel.findOne({
      email,
      firstName,
      lastName,
      dateOfBirth,
    });
    if (student) return true;
    return false;
  }

  async findOne(id: ObjectId) {
    const user = await this.userModel.findById(id);
    return user;
  }

  async getProfile(userID: ObjectId) {
    const user = await this.findOne(userID);
    if (!user) throw new NotFoundException('User not found');
    await user.populate(
      'studentDetails.university studentDetails.languages uniModDetails.uniID companyModDetails.companyID',
    );
    const attachments = await this.getAttachments(userID);
    const output: any = user.toObject();
    delete output.password;
    delete output.studentDetails.followedCompanies;
    delete output.studentDetails.savedJobs;
    delete output.studentDetails.savedEvents;
    if (output.role === UserRole.STUDENT)
      output.studentDetails.attachments = attachments;
    return output;
  }

  async findOneWithEmail(email: string) {
    const user = await this.userModel
      .findOne({ email })
      .populate(
        'uniModDetails.uniID companyModDetails.companyID studentDetails.university',
      );
    return user;
  }

  async update(
    id: ObjectId,
    updateUniversityDto: UpdateStudentDto,
    requestingID: ObjectId,
  ) {
    if (!(await this.checkUni(id, requestingID)))
      throw new UnauthorizedException('User is not from the same university');
    const { status } = updateUniversityDto;

    const std = await this.userModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    return 'Success';
  }

  async updateSuperAdmin(id: ObjectId) {
    const user = await this.userModel.findByIdAndUpdate(id, {
      status: Status.APPROVED,
    });
    if (!user) throw new NotFoundException('User not found');
    return true;
  }

  async addExperience(userID: ObjectId, newExperience: CreateExperienceDto) {
    const {
      companyName,
      companyID,
      title,
      location,
      joiningDate,
      endingDate,
      description,
    } = newExperience;
    if (!companyName && !companyID)
      throw new BadRequestException(
        'Please provide either a company name or an ID',
      );
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    const experience = {
      companyName: !companyID ? companyName : null,
      companyID,
      title,
      location,
      joiningDate,
      endingDate,
      description,
    };

    if (companyID) experience.companyName = null;
    else if (companyName) experience.companyID = null;
    else
      throw new BadRequestException(
        'Please provide either a company name or an ID',
      );

    user.studentDetails.experiences.push(experience);
    await user.save();
    return { data: { message: 'Success' } };
  }

  async updateExperience(
    userID: ObjectId,
    experienceID: ObjectId,
    updateExperience: UpdateExperienceDto,
  ) {
    const user = await this.userModel.findById(userID);

    if (!user) throw new NotFoundException('User not found');

    const experience = user.studentDetails.experiences.find(
      (exp) => exp._id.toString() == experienceID.toString(),
    );
    if (!experience) throw new NotFoundException('Experience not found');

    const {
      companyName,
      companyID,
      title,
      location,
      description,
      joiningDate,
      endingDate,
    } = updateExperience;

    if (companyID) experience.companyID = companyID;
    if (companyName) experience.companyName = companyName;
    if (title) experience.title = title;
    if (location) experience.location = location;
    if (description) experience.description = description;
    if (joiningDate) experience.joiningDate = joiningDate;
    if (endingDate) experience.endingDate = endingDate;

    await user.save();
    return 'success';
  }

  async deleteExperience(userID: ObjectId, experienceID: ObjectId) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');

    const experience = user.studentDetails.experiences.find(
      (exp) => exp._id.toString() == experienceID.toString(),
    );
    if (!experience) throw new NotFoundException('Experience not found');

    user.studentDetails.experiences = user.studentDetails.experiences.filter(
      (exp) => exp._id.toString() != experienceID.toString(),
    );

    await user.save();
    return 'success';
  }

  async getGroups(
    userID: ObjectId,
    owner: boolean,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const matchFilter = {};
    if (owner) matchFilter['owner'] = userID;
    const user = await this.userModel.findById(userID).populate({
      path: 'studentDetails.groups',
      match: matchFilter,
      options: { limit: limit, skip: skip },
    });
    const userJSON = user.toJSON();
    const groups = userJSON.studentDetails.groups as unknown as Group[];
    return groups;
  }

  async addEducation(userID: ObjectId, newEducation: CreateEducationDto) {
    const {
      uniName,
      uniID,
      title,
      categories,
      grade,
      startDate,
      endDate,
      description,
    } = newEducation;
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    const education = {
      uniName,
      uniID,
      title,
      categories,
      grade,
      startDate,
      endDate,
      description,
    };
    if (uniID) education.uniName = null;
    else if (uniName) education.uniID = null;
    else
      throw new BadRequestException(
        'Please provide either a university name or an ID',
      );
    user.studentDetails.educations.push(education);
    await user.save();
    return { data: { message: 'Success' } };
  }

  async updateEducation(
    userID: ObjectId,
    educationID: ObjectId,
    updateEducation: UpdateEducationDto,
  ) {
    const user = await this.userModel.findById(userID);

    const education = user.studentDetails.educations.find(
      (edu) => edu._id.toString() == educationID.toString(),
    );

    if (!education) throw new NotFoundException('Education not found');

    const {
      uniName,
      uniID,
      title,
      categories,
      grade,
      startDate,
      endDate,
      description,
    } = updateEducation;

    if (uniID) education.uniID = uniID;
    if (uniName) education.uniName = uniName;
    if (title) education.title = title;
    if (categories.length) education.categories = categories;
    if (grade) education.grade = grade;
    if (startDate) education.startDate = startDate;
    if (endDate) education.endDate = endDate;
    if (description) education.description = description;

    await user.save();
    return 'success';
  }

  async deleteEducation(userID: ObjectId, educationID: ObjectId) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');

    const education = user.studentDetails.educations.find(
      (edu) => edu._id.toString() == educationID.toString(),
    );
    if (!education) throw new NotFoundException('Education not found');

    user.studentDetails.educations = user.studentDetails.educations.filter(
      (edu) => edu._id.toString() != educationID.toString(),
    );

    await user.save();
    return 'success';
  }

  async updateSkill(
    userID: ObjectId,
    skillID: ObjectId,
    updateSkill: UpdateSkillDto,
  ) {
    const user = await this.userModel.findById(userID);

    if (!user) throw new NotFoundException('User not found');
    const { title, experienceLevel } = updateSkill;
    const skill = user.studentDetails.skills.find(
      (skill) => skill._id.toString() == skillID.toString(),
    );
    if (!skill) throw new NotFoundException('Skill not found');
    if (title) skill.title = title;
    if (experienceLevel) skill.experience = experienceLevel;
    await user.save();
    return 'success';
  }

  async deleteSkill(userID: ObjectId, skillID: ObjectId) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    user.studentDetails.skills = user.studentDetails.skills.filter(
      (skill) => skill._id.toString() != skillID.toString(),
    );
    await user.save();
    return 'Success';
  }

  async addSkill(userID: ObjectId, newSkill: CreateSkillDto) {
    const { title, experienceLevel } = newSkill;
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    user.studentDetails.skills.push({ title, experience: experienceLevel });
    await user.save();
    return 'Success';
  }

  async addAttachment(userID: ObjectId, filePath: string, category: string) {
    const attachment = new this.attachmentModel({
      userID,
      filePath,
      category,
    });
    await attachment.save();
    return 'Success';
  }

  async getAttachments(userID: ObjectId) {
    const attachments = await this.attachmentModel.find({ userID });
    return attachments;
  }

  // TODO: Can reduce one call from here. We already have the uniID
  async checkUni(studentID: ObjectId, requestingID: ObjectId) {
    const student = await this.userModel.findById(studentID);
    if (!student)
      throw new NotFoundException('Student with this ID does not exist');
    const stdUni = student.studentDetails.university.toString();

    const requestingUser = await this.userModel.findById(requestingID);
    const uniID = requestingUser.uniModDetails.uniID.toString();
    console.log({
      stdUni,
      uniID,
    });
    return stdUni === uniID;
  }

  async joinGroup(userID: ObjectId, groupID: ObjectId | Types.ObjectId) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findByIdAndUpdate(
        userID,
        { $addToSet: { 'studentDetails.groups': groupID } }, // Use $addToSet instead of $push
        { session },
      );
      if (!user)
        throw new NotFoundException('User with this ID does not exist');
      const group = await this.groupService.addMember(userID, groupID, session);
      // const group = true;
      if (!group)
        throw new NotFoundException('Group with this ID does not exist');

      await session.commitTransaction();
      await session.endSession();
    } catch (err) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  }

  async followUser(userID: ObjectId, followID: ObjectId) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      $addToSet: { 'studentDetails.following': followID },
    });
    if (!user) throw new NotFoundException('User not found');
    return 'Success';
  }

  async hidePost(userID: ObjectId, postID: ObjectId) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      $addToSet: { 'studentDetails.dislikedPosts': postID },
    });
    if (!user) throw new NotFoundException('User not found');
    return 'Success';
  }

  async unhidePost(userID: ObjectId, postID: ObjectId) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      $pull: { 'studentDetails.dislikedPosts': postID },
    });
    if (!user) throw new NotFoundException('User not found');
    return 'Success';
  }

  async likePost(postID: ObjectId, userID: ObjectId, session: ClientSession) {
    return await this.userModel.findByIdAndUpdate(
      userID,
      { $addToSet: { 'studentDetails.likedPosts': postID } }, // Use $addToSet instead of $push
      { session },
    );
  }

  async getHiddenPosts(userID: ObjectId) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    const { dislikedPosts } = user.studentDetails;
    return dislikedPosts;
  }

  async checkAndAssignUser(userID: ObjectId, uniID: String) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== UserRole.UNI_ADMIN)
      throw new UnauthorizedException('User is not a university moderator');

    if (user?.uniModDetails?.uniID)
      throw new BadRequestException('User is already assigned to a university');

    await this.userModel.findByIdAndUpdate(userID, {
      $set: {
        'uniModDetails.uniID': uniID,
        'uniModDetails.role': UniModRole.OWNER,
      },
    });
    return true;
  }

  async changeUniModStatus(userID: ObjectId, status: Status) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      status,
    });

    return 'success';
  }

  async changeCompanyModStatus(userID: ObjectId, status: Status) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      status,
    });
    return 'success';
  }

  async getStudentsStats(universityID: ObjectId) {
    // Get number of approved students
    const approved = await this.userModel.countDocuments({
      role: UserRole.STUDENT,
      'studentDetails.university': universityID,
      status: Status.APPROVED,
    });

    const pending = await this.userModel.countDocuments({
      role: UserRole.STUDENT,
      'studentDetails.university': universityID,
      status: Status.PENDING,
    });

    const completeProfile = await this.userModel.countDocuments({
      role: UserRole.STUDENT,
      'studentDetails.university': universityID,
      status: Status.APPROVED,
      'studentDetails.dateOfBirth': { $ne: null },
      'studentDetails.educations': { $ne: [] },
      'studentDetails.experiences': { $ne: [] },
      'studentDetails.skills': { $ne: [] },
    });

    return { approved, pending, completeProfile };
  }

  async getStudentDetailByUniversity(universityID: ObjectId) {
    const getStudents = await this.userModel.find(
      {
        'studentDetails.university': universityID,
      },
      '_id firstName lastName status',
    ).lean().exec();;
    return getStudents;
  }

  // TODO: Improve performance here
  async findCounsellors(uniID: ObjectId) {
    const recruiters = await this.userModel.find({
      role: UserRole.UNI_COUNSELOR,
      'uniModDetails.uniID': uniID,
    });
    return recruiters;
  }

  async promoteCounsellor(userID: ObjectId, uniID: ObjectId) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');

    if (
      user.role === UserRole.STUDENT ||
      isCompanyEntity(user.role as UserRole)
    )
      throw new UnauthorizedException(
        'User can not be promoted to a counsellor',
      );
    else if (
      user.uniModDetails.uniID &&
      user.uniModDetails.uniID.toString() !== uniID.toString()
    )
      throw new UnauthorizedException('User is not from this university');

    await this.userModel.findByIdAndUpdate(userID, {
      $set: {
        'uniModDetails.uniID': uniID,
        status: Status.APPROVED,
      },
    });

    return 'success';
  }

  async promoteRecruiter(userID: ObjectId, companyID: ObjectId) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    if (
      user.role === UserRole.STUDENT ||
      user.role === UserRole.UNI_ADMIN ||
      user.role === UserRole.UNI_COUNSELOR
    )
      throw new UnauthorizedException(
        'User can not be promoted to a recruiter',
      );
    else if (
      user.companyModDetails.companyID &&
      user.companyModDetails.companyID.toString() !== companyID.toString()
    )
      throw new UnauthorizedException('User is not from this company');

    await this.userModel.findByIdAndUpdate(userID, {
      $set: {
        'companyModDetails.companyID': companyID,
        status: Status.APPROVED,
      },
    });

    return 'success';
  }

  async checkAndAssignCompany(userID: ObjectId, companyID: String) {
    const user = await this.userModel.findById(userID);
    if (!user) throw new NotFoundException('User not found');
    if (
      user.role !== UserRole.COMPANY_ADMIN &&
      user.role !== UserRole.COMPANY_RECRUITER
    )
      throw new UnauthorizedException('User is not a company moderator');
    if (user?.companyModDetails?.companyID)
      throw new BadRequestException('User is already assigned to a company');
    await this.userModel.findByIdAndUpdate(userID, {
      $set: {
        'companyModDetails.companyID': companyID,
      },
    });
    return true;
  }

  // ? Out of use for now
  async fetchPartnerID(id: ObjectId, role: Entity) {
    if (role === Entity.STUDENT || role === Entity.MOD) return id;
    else if (role === Entity.COMPANY) {
      const company = await this.companyService.findOne(id);
      return company.owner;
    } else if (role === Entity.UNIVERSITY) {
      const university = await this.uniService.findOne(id);
      return university.owner;
    } else throw new BadRequestException('Invalid role or ID');
  }

  // TODO: Add a filter here
  async search(page: number, limit: number, name: string) {
    const MaxLimit = limit;
    const skip = (page - 1) * MaxLimit;
    const words = name.split(/\s+/);
    // Create a regular expression pattern for case-insensitive matching
    const regexPattern = words.map((word) => new RegExp(word, 'i'));

    return await this.userModel
      .find({
        $and: [
          {
            $or: [{ firstName: regexPattern }, { lastName: regexPattern }],
          },
          { role: 'student' }, // Add the condition for the role field
        ],
      })
      .select('firstName lastName email profilePicture')
      .skip(skip)
      .limit(MaxLimit);
  }

  async searchGlobal(userID: ObjectId, query: string, userUni: ObjectId) {
    const page = 1,
      limit = 5;
    const usersPromise = this.search(page, limit, query);
    const groupsPromise = this.groupService.search(userID, page, limit, query);
    const companiesPromise = this.companyService.search(page, limit, query);
    const jobsPromise = this.jobService.search(
      page,
      limit,
      query,
      userUni,
      userID,
    );
    const [users, groups, companies, jobs] = await Promise.all([
      usersPromise,
      groupsPromise,
      companiesPromise,
      jobsPromise,
    ]);
    return {
      users,
      groups,
      companies,
      jobs,
    };
  }

  async getFollowing(userID: ObjectId, populate: boolean = false) {
    const user = await this.userModel.findById(userID);
    if (populate)
      await user.populate({
        path: 'studentDetails.following',
        select:
          'firstName lastName profilePicture email role studentDetails.university',
        populate: [
          {
            path: 'studentDetails.university',
            select: 'name tagline email logo _id',
          },
          {
            path: 'companyModDetails.companyID',
            select: 'name tagline email logo _id',
          },
          {
            path: 'uniModDetails.uniID',
            select: 'name tagline email logo _id',
          },
          {
            path: 'studentDetails.experiences',
            options: { limit: 1 }, // Select only the first element
          },
        ],
      });
    const following = user.studentDetails.following;
    return following;
  }

  async peopleYouMayKnow(userID: ObjectId, uniID: ObjectId) {
    const following = await this.getFollowing(userID);
    const users = await this.userModel
      .find({
        role: UserRole.STUDENT,
        'studentDetails.university': uniID,
        _id: { $nin: following },
      })
      .select(
        'firstName lastName profilePicture email role studentDetails.university',
      )
      .populate({
        path: 'studentDetails.university',
        select: 'name tagline email logo _id',
      });
    return users;
  }

  async getFollowers(userID: ObjectId) {
    const followingUsers = await this.userModel.find({
      'studentDetails.following': userID,
    });
    // For each following user, check if the userID is also present in their following array
    const followers = await Promise.all(
      followingUsers.map(async (user) => {
        const isFollowingBack = user.studentDetails.following.includes(userID);
        const isFollowing =
          isFollowingBack &&
          (await this.userModel.findOne({
            _id: userID,
            'studentDetails.following': user._id,
          })) !== null;
        // .select({
        //   firstName: 1,
        //   lastName: 1,
        //   profilePicture: 1,
        //   email: 1,
        //   role: 1,
        //   'studentDetails.university': 1,
        //   'studentDetails.experiences': { $slice: 1 },
        //   isFollowing: {
        //     $cond: {
        //       if: { $in: [userID, "$studentDetails.following"] }, // Check if userID exists in the following array
        //       then: true, // Return false
        //       else: false // Otherwise, return true
        //     }
        //   } // Check if userID is in following array
        // })
        // .populate({
        //   path: 'studentDetails.university',
        //   select: 'name tagline email logo _id',
        // });
        return {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          email: user.email,
          role: user.role,
          studentDetails: {
            university: user.studentDetails.university,
            experiences: user.studentDetails.experiences.slice(0, 1),
          },
          isFollowing: isFollowing,
        };

        // const filtered = followers.map((follower) => {
        //   const { _id, firstName, lastName, profilePicture, email, role } =
        //     follower;
        //   const isFollowingBack =
        //     follower.studentDetails.following.includes(userID);
        //   const uniID = follower.studentDetails.university;
        //   return {
        //     _id,
        //     firstName,
        //     lastName,
        //     profilePicture,
        //     email,
        //     role,
        //     isFollowingBack,
        //     uniID,
        //   };
        // });
        // return filtered;
      }),
    );
    return followers;
  }
  async getConnections(userID: ObjectId, sameUni: Boolean = false) {
    const followers = await this.getFollowers(userID);

    // const user = await this.userModel
    //   .findById(userID)
    //   .populate('studentDetails.university');

    // if (!user) throw new NotFoundException('User not found');
    // if (user.role !== UserRole.STUDENT)
    //   throw new BadRequestException('User is not a student');

    const following = await this.getFollowing(userID, false);

    const connects = followers.filter((follower) =>
      following.includes(follower._id),
    );

    return connects;

    // const following = user.studentDetails.following;
    // const followingStrings = following.map((f) => f.toString());
    // const connects = followers.filter(
    //   (follower) =>
    //     followingStrings.includes(follower._id.toString()) &&
    //     follower.studentDetails.university.toString() ==
    //       user.studentDetails.university.toString(),
    // );
  }

  async getStudentProfile(userID: ObjectId) {
    const student = await this.userModel
      .findById(userID)
      .select(
        '-password -phoneNumber -role -studentDetails.languages -studentDetails.following -studentDetails.likedPosts -studentDetails.dislikedPosts -studentDetails.groups -studentDetails.followedCompanies -studentDetails.savedJobs -studentDetails._id -studentDetails.createdAt -studentDetails.savedEvents',
      )
      .populate(
        'studentDetails.university',
        '-owner -packageID -dueDate -status',
      )
      .populate('studentDetails.educations.uniID')
      .populate('studentDetails.experiences.companyID');
    return student;
  }

  async countApprovedStudents(uniID: ObjectId) {
    const studentsCount = this.userModel.countDocuments({
      role: UserRole.STUDENT,
      'studentDetails.university': uniID,
      status: Status.APPROVED,
    });
    return studentsCount;
  }

  async support(userID: ObjectId, query: CreateSupport) {
    try {
      const { subject, message } = query;
      await this.mailService.sendEmail(subject, message, userID);
      return 'Success';
    } catch (e) {
      console.log(e);
      throw new Error(e);
    }
  }

  async saveEvent(userID: ObjectId, eventID: ObjectId) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      $addToSet: { 'studentDetails.savedEvents': eventID },
    });
    return 'Success';
  }

  async updateLastLogin(userID: ObjectId) {
    const user = await this.userModel
      .findByIdAndUpdate(userID, { lastLogin: new Date() })
      .select('lastLogin');
    return user;
  }

  async getLoginFrequency(universityID: ObjectId) {
    const frequency = await this.userModel.countDocuments({
      role: UserRole.STUDENT,
      'studentDetails.university': universityID,
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    return frequency;
  }

  async getSavedEvents(userID: ObjectId) {
    const user = await this.userModel
      .findById(userID)
      .populate('studentDetails.savedEvents');
    const savedEvents = user.studentDetails.savedEvents;
    return savedEvents;
  }

  async saveJob(userID: ObjectId, jobID: ObjectId) {
    const user = await this.userModel.findByIdAndUpdate(userID, {
      $addToSet: { 'studentDetails.savedJobs': jobID },
    });
    return 'Success';
  }

  async getSavedJobs(userID: ObjectId) {
    const user = await this.userModel.findById(userID).populate({
      path: 'studentDetails.savedJobs',
      populate: {
        path: 'companyID',
      },
    });
    const savedJobs = user.studentDetails.savedJobs;
    return savedJobs;
  }

  async addLanguages(userID: ObjectId, languages: string[]) {
    const user = await this.userModel
      .findByIdAndUpdate(userID, {
        $addToSet: { 'studentDetails.languages': { $each: languages } },
      })
      .select('studentDetails.languages');
    return user.studentDetails.languages;
  }

  async validateEmail(email: string) {
    const user = await this.userModel.findOne({ email });
    if (user)
      throw new BadRequestException('User with this email already exists');
    return 'Available';
  }

  async remove(id: ObjectId) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = this.userModel.findByIdAndDelete(id, { session });
      const group = this.groupService.removeMember_all(id, session);
      // const posts = this.postService.removeUserPosts(id, session);
      const comments = this.commentService.removeUserComments(id, session);
      const applications = this.applicationService.removeUserApplications(
        id,
        session,
      );
      const all = await Promise.all([
        user,
        group,
        // posts,
        comments,
        applications,
      ]);
      console.log({ all });
      await session.commitTransaction();
      await session.endSession();
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  }
}
