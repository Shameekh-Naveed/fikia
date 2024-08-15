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
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { Status } from 'src/enums/status.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { ObjectId } from 'mongoose';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[Status.APPROVED]])
  @Post()
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: ExtendedRequest,
  ) {
    // const userID = req.user.user._id;
    const { _id: userID, role: userRole, companyID, uniID } = req.user.user;

    const comment = await this.commentService.create(
      createCommentDto,
      userID,
      userRole as UserRole,
      companyID,
      uniID,
    );
    return { _id: comment._id };
  }

  // @Get(':postID')
  // findAll() {
  //   return this.commentService.findAll();
  // }

  @UseGuards(JwtGuard, PermissionsGuard)
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get(':postID')
  async findAll(
    @Param('postID') postID: ObjectId,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const comments = await this.commentService.findAll(postID, page, limit);
    return comments;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentService.update(+id, updateCommentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentService.remove(+id);
  }
}
