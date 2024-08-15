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
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { Status } from 'src/enums/status.enum';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { CreateTextMessageDto } from './dto/create-text-message.dto';
import { ObjectId } from 'mongoose';
import { ObjectIdValidationPipe } from 'src/custom-pipes/object-id.pipe';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { UserRole } from 'src/enums/user-role.enum';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { UploadService } from '../upload/upload.service';
import { MessageParticipantType } from 'src/enums/entity.enum';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('conversation')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly uploadService: UploadService,
  ) {}

  @SetMetadata('roles', [[Status.APPROVED]])
  @Post(':conversationID/message/text')
  async addTextMessage(
    @Param('conversationID', ObjectIdValidationPipe) conversationID: ObjectId,
    @Body() createMessageDto: CreateTextMessageDto,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID } = req.user.user;
    const { content } = createMessageDto;

    return this.conversationService.addMessage(conversationID, userID, {
      content,
    });
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Post(':conversationID/message/file')
  @UseInterceptors(FileInterceptor('file'))
  async addFileMessage(
    @Param('conversationID', ObjectIdValidationPipe) conversationID: ObjectId,
    @Req() req: ExtendedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { _id: userID } = req.user.user;
    if (!file) throw new Error('File not found');
    const fileURL = await this.uploadService.saveFile(file);
    return this.conversationService.addMessage(conversationID, userID, {
      attachment: fileURL,
    });
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Post()
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID, companyID, uniID, role } = req.user.user;
    let userType = MessageParticipantType.USER;
    let requestID = userID;
    if (role === UserRole.COMPANY_ADMIN) {
      userType = MessageParticipantType.COMPANY;
      requestID = companyID;
    } else if (role === UserRole.UNI_ADMIN) {
      userType = MessageParticipantType.UNIVERSITY;
      requestID = uniID;
    }

    const convo = await this.conversationService.create(
      createConversationDto,
      requestID,
      userType,
    );
    return convo;
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Get(':conversationID/messages')
  async getMessages(
    @Param('conversationID', ObjectIdValidationPipe) conversationID: ObjectId,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID, uniID, companyID, role } = req.user.user;
    let requestID = userID;
    if (role === UserRole.COMPANY_ADMIN) requestID = companyID;
    else if (role === UserRole.UNI_ADMIN) requestID = uniID;

    const messages = await this.conversationService.getMessages(
      conversationID,
      requestID,
      page,
      limit,
    );
    return { messages };
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Get(':id')
  async findOne(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID, uniID, companyID, role } = req.user.user;
    let requestID = userID;
    if (role === UserRole.COMPANY_ADMIN) requestID = companyID;
    else if (role === UserRole.UNI_ADMIN) requestID = uniID;

    const coversation = await this.conversationService.findOne(
      id,
      requestID,
      page,
      limit,
    );
    return coversation;
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Get()
  async findAll(@Req() req: ExtendedRequest) {
    const { _id: userID, uniID, companyID, role } = req.user.user;
    let requestID = userID;
    if (role === UserRole.COMPANY_ADMIN) requestID = companyID;
    else if (role === UserRole.UNI_ADMIN) requestID = uniID;
    const conversations = await this.conversationService.findAll(requestID);
    return { conversations };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conversationService.remove(+id);
  }
}
