import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  SetMetadata,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ObjectId } from 'mongoose';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { ConfigService } from '@nestjs/config';
import { MaxStudentsInterceptor } from 'src/interceptors/max-students/max-students.interceptor';
import { CreateSupport } from './dto/create-support.dto';
import { UploadService } from '../upload/upload.service';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Controller('user')
@UseGuards(JwtGuard, PermissionsGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly uploadService: UploadService,
    private configService: ConfigService,
  ) {
    const PORT = this.configService.get<number>('PORT');
    console.log({ PORT });
  }

  @Post()
  @UseInterceptors(FileInterceptor('profilePicture'))
  async create(
    @Body() createUserDto: any,
    @UploadedFile() profilePicture: Express.Multer.File,
  ) {
    console.log({ createUserDto });
    return 'hi. You should not be here.';
    if (profilePicture) {
      const profilePictureURL =
        await this.uploadService.saveFile(profilePicture);
      createUserDto.profilePicture = profilePictureURL;
    }
    const languages = createUserDto.languages.split(',');
    console.log({ languages });
    createUserDto.languages = languages;
    return this.userService.create(createUserDto);
  }

  @SetMetadata('roles', [[UserRole.UNI_ADMIN, Status.APPROVED]])
  @Patch('updateStudentStatus/:id')
  @UseInterceptors(MaxStudentsInterceptor)
  update(
    @Param('id') id: ObjectId,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: ExtendedRequest,
  ) {
    // console.log({ req });
    const requestingID = req.user.user._id;
    return this.userService.update(id, updateStudentDto, requestingID);
  }

  @SetMetadata('roles', [[UserRole.OWNER, Status.APPROVED]])
  @Patch('updateSuperAdminStatus/:id')
  updateSuperAdmin(@Param('id') id: ObjectId) {
    return this.userService.updateSuperAdmin(id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('addLanguages')
  addLanguages(@Body() languages: string[], @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.addLanguages(userID, languages);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('addExperience')
  addExperience(
    @Body() createExperienceDto: CreateExperienceDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.userService.addExperience(userID, createExperienceDto);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('experience/:id')
  updateExperience(
    @Param('id') id: ObjectId,
    @Body() updateExperience: UpdateExperienceDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.userService.updateExperience(userID, id, updateExperience);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Delete('experience/:id')
  deleteExperience(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.deleteExperience(userID, id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('addEducation')
  addEducation(
    @Body() createEducationDto: CreateEducationDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.userService.addEducation(userID, createEducationDto);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('education/:id')
  updateEducation(
    @Param('id') id: ObjectId,
    @Body() updateEducation: UpdateEducationDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.userService.updateEducation(userID, id, updateEducation);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Delete('education/:id')
  deleteEducation(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.deleteEducation(userID, id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('addSkill')
  addSkill(
    @Body() createSkillDto: CreateSkillDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.userService.addSkill(userID, createSkillDto);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('skill/:id')
  updateSkill(
    @Param('id') id: ObjectId,
    @Body() updateSkill: UpdateSkillDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.userService.updateSkill(userID, id, updateSkill);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Delete('skill/:id')
  deleteSkill(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.deleteSkill(userID, id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @UseInterceptors(FileInterceptor('file'))
  @Patch('addAttachment')
  async addAttachment(
    @Body() createAttachmentDto: CreateAttachmentDto,
    @Req() req: ExtendedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userID = req.user.user._id;
    const { category } = createAttachmentDto;
    const filePath = await this.uploadService.saveFile(file);
    return this.userService.addAttachment(userID, filePath, category);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('getAttachments')
  getAttachments(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.getAttachments(userID);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('followUser/:id')
  followUser(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.followUser(userID, id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('hidePost/:id')
  hidePost(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.hidePost(userID, id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('unhidePost/:id')
  unhidePost(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.unhidePost(userID, id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('saveEvent/:id')
  saveEvent(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.saveEvent(userID, id);
  }

  // * Promote a user to a counsellor
  @SetMetadata('roles', [[UserRole.UNI_ADMIN, Status.APPROVED]])
  @Patch('promoteCounsellor/:userID')
  promoteCounsellor(
    @Param('userID') userID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const uniID = req.user.user.uniID;
    return this.userService.promoteCounsellor(userID, uniID);
  }

  // * Promote a user to a recruiter
  @SetMetadata('roles', [[UserRole.COMPANY_ADMIN, Status.APPROVED]])
  @Patch('promoteRecruiter/:userID')
  promoteRecruiter(
    @Param('userID') userID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    return this.userService.promoteRecruiter(userID, companyID);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('people-you-may-know')
  async peopleYouMayKnow(@Req() req: ExtendedRequest) {
    const { _id: userID, uniID } = req.user.user;
    const users = await this.userService.peopleYouMayKnow(userID, uniID);
    return { users };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('getConnections')
  async getConnections(
    @Req() req: ExtendedRequest,
    @Query('same-uni') sameUni: Boolean,
  ) {
    const userID = req.user.user._id;
    const connects = await this.userService.getConnections(userID, sameUni);
    return { connects };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('getFollowing')
  async getFollowing(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    const following = await this.userService.getFollowing(userID, true);
    return { following };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('getFollowers')
  async getFollowers(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    const followers = await this.userService.getFollowers(userID);
    return { followers };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch('student/job/:jobID/save')
  saveJob(@Param('jobID') jobID: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.saveJob(userID, jobID);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('student/job/saved')
  getSavedJobs(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.getSavedJobs(userID);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Post('student/groups/:groupID/join')
  joinGroup(@Param('groupID') groupID: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.joinGroup(userID, groupID);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('student/groups')
  async getGroups(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Query('owner') ownerQuery: string,
  ) {
    const userID = req.user.user._id;
    console.log({ ownerQuery });
    const owner = ownerQuery === 'true' ? true : false;
    const groups = await this.userService.getGroups(userID, owner, page, limit);
    const output = groups.map((group) => {
      const memberCount = group.members.length;
      return { ...group, memberCount, joined: true };
    });
    return { groups: output };
  }

  @SetMetadata('roles', [
    [UserRole.STUDENT, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
    [UserRole.ADMIN, Status.APPROVED],
    [UserRole.OWNER, Status.APPROVED],
  ])
  @Get('student/:id')
  findOneStd(@Param('id') id: ObjectId) {
    // TODO: Check why we have this
    return this.userService.findOne(id);
  }

  @SetMetadata('roles', [
    [UserRole.ADMIN, Status.APPROVED],
    [UserRole.OWNER, Status.APPROVED],
  ])
  @Get('super-admin/:id')
  findOneSuper(@Param('id') id: ObjectId) {
    return this.userService.findOne(id);
  }

  @SetMetadata('roles', [
    [UserRole.ADMIN, Status.APPROVED],
    [UserRole.OWNER, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
  ])
  @Get('uniMod/:id')
  findOneUni(@Param('id') id: ObjectId) {
    // TODO: Check why we have this
    return this.userService.findOne(id);
  }

  @SetMetadata('roles', [
    [UserRole.ADMIN, Status.APPROVED],
    [UserRole.OWNER, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
  ])
  @Get('company-mod/:id')
  findOneCompany(@Param('id') id: ObjectId) {
    // TODO: Check why we have this
    return this.userService.findOne(id);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('search')
  searchGlobal(@Query('query') query: string, @Req() req: ExtendedRequest) {
    const userUni = req.user.user.uniID;
    const userID = req.user.user._id;
    return this.userService.searchGlobal(userID, query, userUni);
  }

  // @SetMetadata('roles', [[Status.APPROVED]])
  @Get()
  // async getProfile(@Query('id') id: ObjectId, @Req() req: ExtendedRequest) {
  async getProfile(@Req() req: ExtendedRequest) {
    // const userID = id || req.user.user._id;
    const userID = req.user.user._id;
    const profile = await this.userService.getProfile(userID);
    return { profile };
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Post('support')
  support(
    @Body() createSupportDto: CreateSupport,
    @Req() req: ExtendedRequest,
  ) {
    console.log(createSupportDto)
    const userID = req.user.user._id;
    console.log(userID)
    return this.userService.support(userID, createSupportDto);
  }

  @SetMetadata('roles', [[]])
  @Delete(':id')
  remove(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.userService.remove(userID);
  }
}
