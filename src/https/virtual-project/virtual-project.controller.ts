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
  Query,
  ParseIntPipe,
  Res,
  Req,
  UseInterceptors,
  UploadedFiles,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { VirtualProjectService } from './virtual-project.service';
import { CreateVirtualProjectDto } from './dto/create-virtual-project.dto';
import { UpdateVirtualProjectDto } from './dto/update-virtual-project.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { ObjectId } from 'mongoose';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { AssignGradeDto } from './dto/assign-grade.dto';
import { MaxVirtualProjectsInterceptor } from 'src/interceptors/max-virtual-projects/max-virtual-projects.interceptor';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { UploadService } from '../upload/upload.service';
import { S3Service } from 'src/utils/s3.service';
@Controller('virtual-project')
@UseGuards(JwtGuard, PermissionsGuard)
export class VirtualProjectController {
  constructor(
    private readonly virtualProjectService: VirtualProjectService,
    private readonly uploadService: UploadService,
    private readonly s3: S3Service,
  ) {}

  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @UseInterceptors(
    // MaxVirtualProjectsInterceptor,
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'introVid', maxCount: 1 },
      { name: 'explanatoryVid' },
    ]),
  )
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createVirtualProjectDto: CreateVirtualProjectDto,
    @Req() req: ExtendedRequest,
    @UploadedFiles()
    files: {
      thumbnail: Express.Multer.File;
      introVid: Express.Multer.File;
      explanatoryVid: Array<Express.Multer.File>;
    },
  ) {
    // const companyID = req.user.user.companyID;
    // return createVirtualProjectDto;
    const { _id: userID, companyID } = req.user.user;
    createVirtualProjectDto.organizationID = companyID;

    // console.log({ files });
    if (!files.thumbnail || !files.introVid)
      throw new BadRequestException('Thumbnail and introVid are required');

    const thumbnailURL = await this.s3.uploadDocument(files.thumbnail[0]);
    const introVidURL = await this.s3.uploadDocument(files.introVid[0]);

    const allExplanatoryVids = await Promise.all(
      files.explanatoryVid.map(async (item) => {
        const url = await this.s3.uploadDocument(item);
        return url;
      }),
    );
    createVirtualProjectDto.tasks.map((item, index) => {
      item.explanatoryVid = allExplanatoryVids[index];
    });

    createVirtualProjectDto.thumbnail = thumbnailURL;
    createVirtualProjectDto.introVid = introVidURL;

    const projectID = await this.virtualProjectService.create(
      createVirtualProjectDto,
      userID,
    );
    return { _id: projectID };
  }

  // * Universities can use this to find all projects that their students have applied to
  @SetMetadata('roles', [[UserRole.UNI_ADMIN, Status.APPROVED]])
  @Get('university')
  findAllUni(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const uniID = req.user.user.uniID;
    return this.virtualProjectService.findAllUni(page, limit, uniID);
  }

  // * Companies can use this to find all projects that they have created
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('company')
  findAllCompany(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    console.log({ companyID });
    return this.virtualProjectService.findAllCompany(page, limit, companyID);
  }

  // * Get all students and their status for a particular project
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('applicants/:id')
  getApplicants(@Param('id') projectID: ObjectId, @Req() req: ExtendedRequest) {
    const uniID = req.user.user.uniID;
    const companyID = req.user.user.companyID;
    return this.virtualProjectService.getApplicants(
      projectID,
      uniID,
      companyID,
    );
  }

  // * Get the details of a particular applicant for a particular project
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.STUDENT, Status.APPROVED],
  ])
  @Get('applicant/:id')
  getApplicant(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const { uniID, companyID, role, _id } = req.user.user;
    return this.virtualProjectService.getApplicant(
      id,
      role,
      _id,
      uniID,
      companyID,
    );
  }

  // * For companies to get stats about their projects
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('stats')
  getStats(@Req() req: ExtendedRequest) {
    const companyID = req.user.user.companyID;
    return this.virtualProjectService.getStats(companyID);
  }

  // * For companies to get the top universities that the students of their VWPs are from
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('top-universities')
  getTopUnis(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const companyID = req.user.user.companyID;
    return this.virtualProjectService.topUnis(companyID, null, page, limit);
  }

  // * For recruiters to get the top universities that the students of their VWPs are from
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('recruiter/top-universities')
  getTopUnis_Recruiter(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const companyID = req.user.user.companyID;
    const userID = req.user.user._id;
    return this.virtualProjectService.topUnis(companyID, userID, page, limit);
  }

  // * For recruiters to get the submissions that have applied to their VWPs
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('recruiter/completions')
  getCompletions_Recruiter(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const companyID = req.user.user.companyID;
    const userID = req.user.user._id;
    return this.virtualProjectService.completedProjects(
      companyID,
      userID,
      page,
      limit,
    );
  }

  // * For recruiters to get the number of submissions that have applied to their VWPs
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('recruiter/submissions/month/:month/:year')
  getSubmissionsByMonth_Recruiter(
    @Req() req: ExtendedRequest,
    @Param('month') month: number,
    @Param('year') year: number,
  ) {
    const companyID = req.user.user.companyID;
    const userID = req.user.user._id;

    return this.virtualProjectService.submissionInMonth(
      companyID,
      userID,
      month - 1, // * month is 0 indexed
      year,
    );
  }

  // * For companies to get the submissions that have applied to their VWPs
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('completions')
  getCompletions(
    @Req() req: ExtendedRequest,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const companyID = req.user.user.companyID;
    return this.virtualProjectService.completedProjects(
      companyID,
      null,
      page,
      limit,
    );
  }

  // * For companies to get the number of submissions that have applied to their VWPs
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('submissions/month/:month/:year')
  getSubmissionsByMonth(
    @Req() req: ExtendedRequest,
    @Param('month') month: number,
    @Param('year') year: number,
  ) {
    const companyID = req.user.user.companyID;
    return this.virtualProjectService.submissionInMonth(
      companyID,
      null,
      month - 1, // * month is 0 indexed
      year,
    );
  }

  // * For companies to get complete submission profile of a vwp along with student details
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Get('submission/:submissionID')
  getSubmissionProfile(
    @Param('submissionID') submissionID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    return this.virtualProjectService.submissionProfile(
      submissionID,
      companyID,
    );
  }

  // * Assign grade to a particular applicant for a particular task
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Patch('grade/:id')
  assignGrade(
    @Param('id') id: ObjectId,
    @Body() data: AssignGradeDto,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID, companyID } = req.user.user;
    return this.virtualProjectService.assignGrade(id, data, companyID, userID);
  }

  // * Issue a certificate to a particular applicant for a particular project
  @SetMetadata('roles', [
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
  ])
  @Patch('issue-certificate/:submissionID')
  @UseInterceptors(FileInterceptor('certificate'))
  async issueCertificate(
    @Param('submissionID') submissionID: ObjectId,
    @UploadedFile() certificate: Express.Multer.File,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    if (!certificate)
      throw new BadRequestException('Certificate file is required');
    const certificateURL = await this.uploadService.saveFile(certificate);
    return this.virtualProjectService.issueCertificate(
      submissionID,
      companyID,
      certificateURL,
    );
  }

  // * For students to apply to a project
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Post('apply/:id')
  async apply(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    const applicationID = await this.virtualProjectService.apply(id, userID);
    return { _id: applicationID };
  }

  // * For students to submit a task
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @UseInterceptors(FilesInterceptor('uploads'))
  @Post('submitTask/:projID/:taskID')
  async submitTask(
    @Param('projID') projID: ObjectId,
    @Param('taskID') taskID: ObjectId,
    @Req() req: ExtendedRequest,
    @UploadedFiles() uploads: Array<Express.Multer.File>,
  ) {
    const userID = req.user.user._id;
    // let uploadedFiles: string[];
    const uploadedFiles = await this.uploadService.saveFiles(uploads);
    return this.virtualProjectService.submitTask(
      projID,
      taskID,
      userID,
      uploadedFiles,
    );
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('inprogress')
  findInProgress(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.virtualProjectService.findInProgress(page, limit, userID);
  }

  @SetMetadata('roles', [
    [UserRole.STUDENT, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
  ])
  @Get(':id')
  async findOne(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    const userUni = req.user.user.uniID;
    const userRole = req.user.user.role;
    const companyID = req.user.user.companyID;
    let data = await this.virtualProjectService.findOne(
      id,
      userUni,
      userRole,
      userID,
      companyID,
    );
    if (data['thumbnail']) {
      const getThumbnail = await this.s3.generateSignedUrl(data['thumbnail']);
      data['thumbnail'] = getThumbnail;
    }
    if (data['introVid']) {
      const getThumbnail = await this.s3.generateSignedUrl(
        data['introVid'],
      );
      data['introVid'] = getThumbnail;
    }
    if (data['tasks']) {
      await Promise.all(data['tasks'].map(async (item) => {
        let signedurl = await this.s3.generateSignedUrl(item.explanatoryVid);
        item.explanatoryVid = signedurl;
      }));
      
    }
    return data;
  }

  // * Students can use this to find all projects that they can apply to (that have been approved by their universities ofc)
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get()
  findAll(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const userUni = req.user.user.uniID;
    return this.virtualProjectService.findAll(page, limit, userUni);
  }

  @SetMetadata('roles', [[UserRole.UNI_ADMIN, Status.APPROVED]])
  @Patch('approve/:id')
  approve(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const uniID = req.user.user.uniID;
    return this.virtualProjectService.approve(id, uniID);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVirtualProjectDto: UpdateVirtualProjectDto,
  ) {
    return this.virtualProjectService.update(+id, updateVirtualProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.virtualProjectService.remove(+id);
  }
}
