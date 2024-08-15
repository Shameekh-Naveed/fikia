import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  SetMetadata,
  Req,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ObjectId } from 'mongoose';
import { CommentPostDto } from './dto/comment-post.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { Status } from 'src/enums/status.enum';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from 'src/enums/user-role.enum';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { ParseFilesPipeCutsom } from 'src/custom-pipes/parse-file.pipe';
import { UploadService } from '../upload/upload.service';
import { ObjectIdValidationPipe } from 'src/custom-pipes/object-id.pipe';

@Controller('post')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly uploadService: UploadService,
  ) {
    console.log('Post controller initialized');
  }

  // Add a new post
  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @Post('create')
  @UseInterceptors(FilesInterceptor('images'))
  async create(
    @UploadedFiles(new ParseFilesPipeCutsom('image'))
    uploads: Array<Express.Multer.File>,
    @Body() createPostDto: CreatePostDto,
    @Req() req: ExtendedRequest,
  ) {
    // const userID = req.user.user._id;
    // const userRole = req.user.user.role as UserRole;
    const { _id: userID, role: userRole, companyID, uniID } = req.user.user;
    let images: string[] = [];
    if (uploads && uploads.length)
      images = await this.uploadService.saveFiles(uploads);
    createPostDto.images = images;

    createPostDto.isGroupPost = JSON.parse(`${createPostDto.isGroupPost}`);
    createPostDto.isEventPost = JSON.parse(`${createPostDto.isEventPost}`);

    if (createPostDto.isGroupPost && createPostDto.isEventPost)
      throw new BadRequestException(
        'Post can not belong to both a group and an event',
      );

    const postID = await this.postService.create(
      createPostDto,
      userID,
      userRole as UserRole,
      companyID,
      uniID,
    );
    return { _id: postID };
  }

  // Get posts for your feed
  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('feed')
  getFeed(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.postService.getFeed(page, limit, userID);
  }

  // Get a specific post
  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @Get(':id')
  findOne(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    return this.postService.findOne(id, userID);
  }

  // Get all posts of a specific user
  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @Get('user/:id')
  getUsersPosts(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Param('id') id: ObjectId,
  ) {
    return this.postService.getUsersPosts(page, limit, id);
  }

  // Get all posts
  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @Get()
  getPosts(
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Query('userID', ObjectIdValidationPipe) userID: ObjectId,
    @Query('eventID', ObjectIdValidationPipe) eventID: ObjectId,
    @Query('groupID', ObjectIdValidationPipe) groupID: ObjectId,
    @Query('uniID', ObjectIdValidationPipe) uniID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const requestID = req.user.user._id;
    console.log({ userID, eventID, groupID });
    return this.postService.getPosts(
      page,
      limit,
      userID,
      eventID,
      groupID,
      uniID,
      requestID,
    );
  }

  // Like a specific post
  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @Patch('like/:id')
  likePost(@Param('id') id: ObjectId, @Req() req: ExtendedRequest) {
    const userID = req.user.user._id;
    console.log({ userID });
    return this.postService.likePost(id, userID);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(+id, updatePostDto);
  }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('permissions', [
    [Status.APPROVED, UserRole.STUDENT],
    [Status.APPROVED, UserRole.ADMIN],
    [Status.APPROVED, UserRole.OWNER],
  ])
  @Delete(':id')
  remove(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    const role = req.user.user.role;
    return this.postService.remove(id, userID, role);
  }
}
