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
  Req,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { ObjectId } from 'mongoose';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { FilterParameterPipe } from 'src/custom-pipes/filter-parameter.pipe';
import { Interval } from 'src/enums/interval.enum';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.COMPANY_ADMIN],
    [Status.APPROVED, UserRole.COMPANY_RECRUITER],
  ])
  @Post()
  async create(
    @Body() createJobDto: CreateJobDto,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    createJobDto.companyID = companyID;
    const userID = req.user.user._id;

    const jobID = await this.jobService.create(userID, createJobDto);
    return { _id: jobID };
  }

  // * For students to search for/get all jobs (only from their university)
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('search')
  search(
    @Query('title') title: string,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Query('interval', FilterParameterPipe) interval: Interval,
    @Req() req: ExtendedRequest,
  ) {
    const userUni = req.user.user.uniID;
    const userID = req.user.user._id;
    return this.jobService.search(
      page,
      limit,
      title || '',
      userUni,
      userID,
      interval,
    );
  }

  // * For anyone to get a single job
  @SetMetadata('roles', [[Status.APPROVED]])
  @Get(':id')
  async findOne(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {

    let get_job_details = await this.jobService.findOne(id,req.user.user);
  
    return get_job_details
  }

  // * For company admin, owner, and recruiter to get all their jobs
  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.COMPANY_ADMIN],
    [Status.APPROVED, UserRole.COMPANY_RECRUITER],
  ])
  @Get()
  async findAll(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const companyID = req.user.user.companyID;
    const jobs = await this.jobService.findAll(page, limit, companyID);
    return jobs;
  }

  // * For university admin to approve a job
  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.UNI_ADMIN],
    [Status.APPROVED, UserRole.UNI_COUNSELOR],
  ])
  @Patch('approveJob/:id')
  approveJob(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userUni = req.user.user.uniID;
    return this.jobService.approveJob(id, userUni);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(+id, updateJobDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(+id);
  }
}
