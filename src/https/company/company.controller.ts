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
  UploadedFiles,
  BadRequestException,
  Query,
  ParseIntPipe,
  ParseFilePipeBuilder,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { ObjectId } from 'mongoose';
import { Status } from 'src/enums/status.enum';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import {
  ParseFilePipeCutsom,
  ParseFilesPipeCutsom,
} from 'src/custom-pipes/parse-file.pipe';
import { UploadService } from '../upload/upload.service';

@Controller('company')
@UseGuards(JwtGuard, PermissionsGuard)
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly uploadService: UploadService,
  ) {}

  @SetMetadata('roles', [[UserRole.COMPANY_ADMIN]])
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'companyEnvironment', maxCount: 5 },
    ]),
  )
  async create(
    @Body() createCompanyDto: CreateCompanyDto,
    @Req() req: ExtendedRequest,
    @UploadedFiles(new ParseFilesPipeCutsom('image'))
    files: {
      logo: Express.Multer.File;
      companyEnvironment: Express.Multer.File[];
    },
  ) {
    const userID = req.user.user._id;
    createCompanyDto.owner = userID;
    if (!files.logo) throw new BadRequestException('Logo is required');
    const images = await this.uploadService.saveFile(files.logo[0]);
    createCompanyDto.logo = images;
    if (files.companyEnvironment?.length > 0) {
      const companyEnvironment = await this.uploadService.saveFiles(
        files.companyEnvironment,
      );
      createCompanyDto.companyEnvironment = companyEnvironment;
    }
    const company = await this.companyService.create(createCompanyDto);
    return { _id: company };
  }

  @SetMetadata('roles', [[Status.APPROVED, UserRole.COMPANY_ADMIN]])
  @Patch(':id/addCompanyEnvironment')
  @UseInterceptors(FilesInterceptor('companyEnvironment', 5))
  async addCompanyEnvironment(
    @Param('id') id: ObjectId,
    @Req() req: ExtendedRequest,
    @UploadedFiles(new ParseFilesPipeCutsom('image'))
    companyEnvironment: Array<Express.Multer.File>,
  ) {
    const userCompany = req.user.user.companyID;
    if (userCompany.toString() !== id.toString())
      throw new BadRequestException('You do not own this company');
    const companyEnvironmentPaths =
      await this.uploadService.saveFiles(companyEnvironment);
    const updatedCompany = await this.companyService.addCompanyEnvironment(
      id,
      companyEnvironmentPaths,
    );
    return { company: updatedCompany };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('search')
  search(
    @Query('name') name: string,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    return this.companyService.search(page, limit, name);
  }

  @SetMetadata('roles', [[]])
  @Get(':id')
  async findOne(@Param('id') id: ObjectId) {
    const company = await this.companyService.findOne(id);
    return { company };
  }

  @SetMetadata('roles', [
    [UserRole.OWNER, Status.APPROVED],
    [UserRole.ADMIN, Status.APPROVED],
  ])
  @Patch('updateStatus/:id')
  update(
    @Param('id') id: ObjectId,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, updateCompanyDto);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
  //   return this.companyService.update(+id, updateCompanyDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(+id);
  }
}
