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
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ObjectId } from 'mongoose';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { ExtendedRequest } from 'src/interfaces/extended-request';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.ADMIN],
    [Status.APPROVED, UserRole.OWNER],
    [Status.APPROVED, UserRole.UNI_ADMIN],
  ])
  @Get('user')
  async findAllStudents(@Req() req: ExtendedRequest) {
    const uniID = req.user.user.uniID;
    const role = req.user.user.role as UserRole;
    const reports = await this.reportService.findAllStudents(uniID, role);
    return { reports };
  }

  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.ADMIN],
    [Status.APPROVED, UserRole.OWNER],
  ])
  @Get('post')
  async findAllPosts() {
    const reports = await this.reportService.findAllPosts();
    return { reports };
  }

  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.ADMIN],
    [Status.APPROVED, UserRole.OWNER],
  ])
  @Get('post')
  async findAllEvents() {
    const reports = await this.reportService.findAllEvents();
    return { reports };
  }

  @SetMetadata('roles', [
    [Status.APPROVED, UserRole.ADMIN],
    [Status.APPROVED, UserRole.OWNER],
    [Status.APPROVED, UserRole.UNI_ADMIN],
  ])
  @Get(':id')
  findOne(@Param('id') id: ObjectId) {
    return this.reportService.findOne(id);
  }

  @Patch('resolve/:id')
  resolve(@Param('id') id: ObjectId) {
    return this.reportService.resolve(id);
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Patch(':entity/:id')
  async report(
    @Param('entity') entity: 'user' | 'post' | 'event',
    @Param('id') id: ObjectId,
    @Body() createReportDto: CreateReportDto,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    const report = await this.reportService.report(
      userID,
      entity,
      id,
      createReportDto,
    );
    return { _id: report._id };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportService.remove(+id);
  }
}
