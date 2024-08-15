import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  SetMetadata,
  UseInterceptors,
  UploadedFile,
  Req,
  Query,
  ParseIntPipe,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { ObjectId } from 'mongoose';
import { ShortlistApplicationDto } from './dto/shortlist-application.dto';
import { InterviewApplicationDto } from './dto/interview-application.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { JobStatus } from 'src/enums/job-status.enum';
import { ApplicationStatus } from 'src/enums/application-status.enum';
import { isEnum } from 'class-validator';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { ParseFilePipeCutsom } from 'src/custom-pipes/parse-file.pipe';
import { UploadService } from '../upload/upload.service';
import { ObjectIdValidationPipe } from 'src/custom-pipes/object-id.pipe';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('application')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly uploadService: UploadService,
  ) {}

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @UseInterceptors(FileInterceptor('resume'))
  @Post()
  async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @UploadedFile(new ParseFilePipeCutsom('document'))
    resume: Express.Multer.File,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    createApplicationDto.userID = userID;
    const upload = await this.uploadService.saveFile(resume);
    createApplicationDto.resume = upload;
    const applicationID =
      await this.applicationService.create(createApplicationDto);
    return { _id: applicationID };
  }

  // * Given a job ID, return applications for that job
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.STUDENT, Status.APPROVED],
  ])
  @Get('job/:jobID')
  async findForJob(
    @Param('jobID', ObjectIdValidationPipe) jobID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    const userID = req.user.user._id;
    const role = req.user.user.role;

    const applications = await this.applicationService.findForJob(
      jobID,
      companyID,
      userID,
      role as UserRole,
    );
    return applications;
  }

  // * For companies to get a complete application for a user
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('completeApplication/:id')
  async getCompleteApplication(
    @Param('id', ObjectIdValidationPipe) userID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    // const userID = req.user.user._id;
    const companyID = req.user.user.companyID;
    const application = await this.applicationService.getCompleteApplication(
      userID,
      companyID,
    );
    return application;
  }

  // * For companies to get stats about their jobs
  @SetMetadata('roles', [[UserRole.COMPANY_ADMIN, Status.APPROVED]])
  @Get('company/stats')
  getStatsCompany(@Req() req: ExtendedRequest) {
    const companyID = req.user.user.companyID;
    return this.applicationService.getStatsCompany(companyID, null);
  }

  // * For recruiters to get stats about their jobs
  @SetMetadata('roles', [
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
  ])
  @Get('recruiter/stats')
  getStatsCompany_Recruiter(@Req() req: ExtendedRequest) {
    const { _id: userID, companyID } = req.user.user;
    return this.applicationService.getStatsCompany(companyID, userID);
  }

  // * For companies to get the top universities that the students of their jobs are from
  @SetMetadata('roles', [[UserRole.COMPANY_ADMIN, Status.APPROVED]])
  @Get('top-universities')
  getTopUnis(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const companyID = req.user.user.companyID;
    return this.applicationService.topUnis(companyID, null, page, limit);
  }

  // * For recruiters to get the top universities that the students of their jobs are from
  @SetMetadata('roles', [
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
  ])
  @Get('recruiter/top-universities')
  getTopUnis_Recruiter(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const { _id: userID, companyID } = req.user.user;
    return this.applicationService.topUnis(companyID, userID, page, limit);
  }

  // * For companies to get the number of submissions that have applied to their jobs
  @SetMetadata('roles', [[UserRole.COMPANY_ADMIN, Status.APPROVED]])
  @Get('month/:month/:year')
  getSubmissionsByMonth(
    @Req() req: ExtendedRequest,
    @Param('month') month: number,
    @Param('year') year: number,
  ) {
    const companyID = req.user.user.companyID;
    return this.applicationService.applicationsMonth(
      companyID,
      month - 1, // * month is 0 indexed
      year,
      null,
    );
  }

  // * For companies to get the number of submissions that have applied to their jobs
  @SetMetadata('roles', [[UserRole.COMPANY_ADMIN, Status.APPROVED]])
  @Get('recruiter/month/:month/:year')
  getSubmissionsByMonth_Recruiter(
    @Req() req: ExtendedRequest,
    @Param('month') month: number,
    @Param('year') year: number,
  ) {
    // const companyID = req.user.user.companyID;
    const { _id: userID, companyID } = req.user.user;

    return this.applicationService.applicationsMonth(
      companyID,
      month - 1, // * month is 0 indexed
      year,
      userID,
    );
  }

  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Patch('shortlist/:id')
  shortlist(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    // const userCompanyID = req.user.user.companyID;
    const { _id: userID, companyID } = req.user.user;
    return this.applicationService.shortlist(id, companyID, userID);
  }

  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Patch('interview/:id')
  interview(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Body() updateApplicationDto: InterviewApplicationDto,
    @Req() req: ExtendedRequest,
  ) {
    // const userCompanyId = req.user.user.companyID;
    const { _id: userID, companyID } = req.user.user;

    return this.applicationService.interview(
      id,
      updateApplicationDto,
      companyID,
      userID,
    );
  }

  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Patch('rate/:id')
  rate(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Body('rating') rating: number,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID, companyID } = req.user.user;

    return this.applicationService.rate(id, rating, companyID, userID);
  }

  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Patch('reject/:id')
  reject(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    // const userCompanyId = req.user.user.companyID;
    const { _id: userID, companyID } = req.user.user;

    return this.applicationService.reject(id, companyID, userID);
  }

  // * For students to get the stats of all their applications
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('student/stats')
  async getStats(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    const stats = await this.applicationService.getStats(userID);
    return stats;
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('applicationGraph')
  async applicationGraph(@Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    console.log({ userID });
    const kpi = await this.applicationService.applicationGraph(userID);
    return kpi;
  }

  // * Get details of a particular application
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.STUDENT, Status.APPROVED],
  ])
  @Get(':id')
  async findOne(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    const companyID = req.user.user.companyID;

    const application = await this.applicationService.findOne(
      id,
      userID,
      companyID,
    );
    return application;
  }

  //* If company mod requests, he will get all applications for his company,
  //* If student requests he shall get all applications of his
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.STUDENT, Status.APPROVED],
  ])
  @Get()
  async find(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Query('stage') stage?: ApplicationStatus,
  ) {
    if (stage && !isEnum(stage, ApplicationStatus))
      throw new BadRequestException('Stage must be a valid application Stage');

    const userID = req.user.user._id;
    const companyID = req.user.user.companyID;

    const applications = await this.applicationService.find(
      page,
      limit,
      userID,
      companyID,
      stage,
    );
    return applications;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationService.remove(+id);
  }
}
