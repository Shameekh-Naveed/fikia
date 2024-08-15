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
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadGatewayException,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { ObjectId } from 'mongoose';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ParseFilePipeCutsom } from 'src/custom-pipes/parse-file.pipe';
import { UploadService } from '../upload/upload.service';
import { ObjectIdValidationPipe } from 'src/custom-pipes/object-id.pipe';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('group')
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly uploadService: UploadService,
  ) {}

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Post()
  @UseInterceptors(FileInterceptor('coverPhoto'))
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() req: ExtendedRequest,
    @UploadedFile(new ParseFilePipeCutsom('image'))
    coverPhoto: Express.Multer.File,
  ) {
    const userID = req.user.user._id;
    if (coverPhoto) {
      const coverPhotoURL = await this.uploadService.saveFile(coverPhoto);
      createGroupDto.coverPhoto = coverPhotoURL;
    }

    const groupID = await this.groupService.create(createGroupDto, userID);
    return { _id: groupID };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('search')
  async search(
    @Req() req: ExtendedRequest,
    @Query('name') name: string,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const userID = req.user.user._id;
    const groups = await this.groupService.search(userID, page, limit, name);
    return { groups };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('members/:groupID')
  async getMembers(
    @Param('groupID', ObjectIdValidationPipe) groupID: ObjectId,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const members = await this.groupService.getMembers(groupID, page, limit);
    return { members };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get(':id')
  async findOne(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    const group = await this.groupService.findOne(id);
    const output: any = group.toJSON();
    output.memberCount = group.members.length;
    output.joined = group.members.includes(userID);
    return { group: output };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get()
  async findAll(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    const groups = await this.groupService.findTrending(userID, page, limit);
    return { groups };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(+id, updateGroupDto);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Delete(':groupID')
  remove(@Param('groupID') groupID: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.groupService.remove(groupID, userID);
  }
}
