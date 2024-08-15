import {
  Controller,
  Post,
  SetMetadata,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Body,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { Status } from 'src/enums/status.enum';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @UseInterceptors(FilesInterceptor('files', 5))
  @Post()
  async create(@UploadedFiles() files: Express.Multer.File[]) {
    const paths = await this.uploadService.saveFiles(files);
    return { paths };
  }
}
