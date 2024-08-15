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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpException,
  HttpStatus,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { UniversityService } from './university.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { ObjectId } from 'mongoose';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { ParseFilesPipeCutsom } from 'src/custom-pipes/parse-file.pipe';
import { UploadService } from '../upload/upload.service';
import { ApprovedStudent } from 'src/db/schemas/approvedStudent.schema';
import { FilterParameterPipe } from 'src/custom-pipes/filter-parameter.pipe';

@Controller('university')
export class UniversityController {
  constructor(
    private readonly universityService: UniversityService,
    private readonly uploadService: UploadService,
  ) {}

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[UserRole.UNI_ADMIN]])
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'coverPicture', maxCount: 1 },
      { name: 'studentsData', maxCount: 1 },
    ]),
  )
  async create(
    @Body() createUniversityDto: CreateUniversityDto,
    @Req() req: ExtendedRequest,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File;
      coverPicture?: Express.Multer.File;
      studentsData?: Express.Multer.File;
    },
  ) {
    const userID = req.user.user._id;
    if (files.logo) {
      const url = await this.uploadService.saveFile(files.logo[0]);
      createUniversityDto.logo = url;
    } else throw new BadRequestException('Logo not provided');
    if (files.coverPicture) {
      const url = await this.uploadService.saveFile(files.coverPicture[0]);
      createUniversityDto.coverPicture = url;
    } else createUniversityDto.coverPicture = '';

    let studentsData: ApprovedStudent[] = [];
    if (files.studentsData)
      studentsData = await this.uploadService.parseExcelFile(
        files.studentsData[0],
      );

    const { uniID, updatedToken } = await this.universityService.create(
      createUniversityDto,
      studentsData,
      userID,
    );
    return { _id: uniID, updatedToken };
  }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[UserRole.UNI_ADMIN, Status.APPROVED]])
  @Get('approved-students')
  async getApprovedStudents(@Req() req: ExtendedRequest) {
    const uniID = req.user.user.uniID;
    const students = await this.universityService.getApprovedStudents(uniID);
    return { students };
  }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[UserRole.UNI_ADMIN, Status.APPROVED]])
  @Patch('approved-students')
  @UseInterceptors(FileInterceptor('studentsData'))
  async addApprovedStudents(
    @Req() req: ExtendedRequest,
    @UploadedFile() studentsData: Express.Multer.File,
  ) {
    const uniID = req.user.user.uniID;
    if (!studentsData) throw new BadRequestException('File not provided');
    const file: ApprovedStudent[] =
      await this.uploadService.parseExcelFile(studentsData);
    return this.universityService.addApprovedStudents(uniID, file);
  }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
  ])
  @Get('students-data')
  getStudentData(@Req() req: ExtendedRequest) {
    const uniID = req.user.user.uniID;
    return this.universityService.getStudentsData(uniID);
  }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [
    [UserRole.UNI_ADMIN, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
  ])
  @Get('students-data-detail')
  getDetailedStudentData(@Req() req: ExtendedRequest) {
    const uniID = req.user.user.uniID;
    return this.universityService.getStudentsDataDetail(uniID);
  }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [
    [UserRole.OWNER, Status.APPROVED],
    [UserRole.ADMIN, Status.APPROVED],
  ])
  @Get('approved')
  findAllApproved() {
    return this.universityService.findAllApproved();
  }

  @Get(':id')
  findOne(@Param('id') id: ObjectId) {
    return this.universityService.findOne(id);
  }

  @Get()
  findAll(@Query('name', FilterParameterPipe) name: string) {
    return this.universityService.findAll(name);
  }

  @SetMetadata('roles', [
    [UserRole.OWNER, Status.APPROVED],
    [UserRole.ADMIN, Status.APPROVED],
  ])
  @Patch('updateStatus/:id')
  update(
    @Param('id') id: ObjectId,
    @Body() updateUniversityDto: UpdateUniversityDto,
  ) {
    return this.universityService.update(id, updateUniversityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.universityService.remove(+id);
  }
}
