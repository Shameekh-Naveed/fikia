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
  UploadedFile,
  ParseFilePipe,
  BadRequestException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/authorization/permissions/permissions.guard';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { ExtendedRequest } from 'src/interfaces/extended-request';
import { FilterParameterPipe } from 'src/custom-pipes/filter-parameter.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeCutsom } from 'src/custom-pipes/parse-file.pipe';
import { PaginationPipe } from 'src/custom-pipes/pagination.pipe';
import { ObjectId } from 'mongoose';
import { isCompanyManager } from 'src/utils/misc';
import { UploadService } from '../upload/upload.service';
import { ObjectIdValidationPipe } from 'src/custom-pipes/object-id.pipe';
import { EventType } from 'src/enums/event-type.enum';
import { Event } from 'src/db/schemas/event.schema';

@Controller('event')
@UseGuards(JwtGuard, PermissionsGuard)
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly uploadService: UploadService,
    // private readonly userService: UserService,
  ) {}

  @SetMetadata('roles', [
    [UserRole.STUDENT, Status.APPROVED],
    // [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
    // [UserRole.UNI_ADMIN, Status.APPROVED],
  ])
  @UseInterceptors(FileInterceptor('coverPhoto'))
  @Post()
  async create(
    @Body() createEventDto: CreateEventDto,
    @Req() req: ExtendedRequest,
    @UploadedFile(new ParseFilePipeCutsom('image'))
    coverPhoto: Express.Multer.File,
  ) {
    const { _id: userID, role, companyID, uniID } = req.user.user;

    createEventDto.status = Status.APPROVED;

    if (isCompanyManager(role as UserRole))
      createEventDto.status = Status.PENDING;

    // createEventDto.host = isCompanyManager(role as UserRole)
    //   ? companyID
    //   : userID;
    // createEventDto.eventOwner = isCompanyManager(role as UserRole)
    //   ? 'Company'
    //   : 'User';

    createEventDto.host = userID;

    if (!coverPhoto)
      throw new BadRequestException('Please provide a cover photo');

    if (role === UserRole.STUDENT || role === UserRole.UNI_COUNSELOR)
      createEventDto.university = uniID;
    else if (!createEventDto.university)
      throw new BadRequestException('Please provide a university');

    const upload = await this.uploadService.saveFile(coverPhoto);
    createEventDto.coverPhoto = upload;

    const event = await this.eventService.create(createEventDto);
    return { _id: event };
  }
  

  // * Students can update their going status for an event
  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch(':id/status/:status')
  patchStatus(
    @Param('id') eventID: ObjectId,
    @Param('status') status: 'interested' | 'going' | 'notInterested',
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.eventService.update(eventID, userID, status);
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Patch(':id/invite/:inviteID')
  invite(
    @Param('id') eventID: ObjectId,
    @Param('inviteID') inviteID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.eventService.invite(eventID, userID, inviteID);
  }

  @SetMetadata('roles', [
    [UserRole.STUDENT, Status.APPROVED],
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
    [UserRole.COMPANY_RECRUITER, Status.APPROVED],
    [UserRole.UNI_COUNSELOR, Status.APPROVED],
    [UserRole.UNI_ADMIN, Status.APPROVED],
  ])
  @Patch(':id/update')
  @UseInterceptors(FileInterceptor('coverPhoto'))
  async update(
    @Param('id') id: ObjectId,
    @Body() updateEventDto: UpdateEventDto,
    @Req() req: ExtendedRequest,
    @UploadedFile(new ParseFilePipeCutsom('image'))
    coverPhoto: Express.Multer.File,
  ) {
    const { _id: userID, role, companyID, uniID } = req.user.user;
    if (coverPhoto) {
      const upload = await this.uploadService.saveFile(coverPhoto);
      updateEventDto.coverPhoto = upload;
    }
    const event = await this.eventService.updateEvent(
      id,
      updateEventDto,
      userID,
      role as UserRole,
      companyID,
      uniID,
    );
    return { event };
  }

  @SetMetadata('roles', [
    [UserRole.STUDENT, Status.APPROVED],
    [UserRole.COMPANY_ADMIN, Status.APPROVED],
  ])
  @Patch(':id/cancel')
  async cancelEvent(
    @Req() req: ExtendedRequest,
    @Param('id', ObjectIdValidationPipe) eventID: ObjectId,
  ) {
    const { _id: userID, role: userRole, companyID } = req.user.user;
    const events = await this.eventService.cancelEvent(
      eventID,
      userID,
      userRole as UserRole,
      companyID,
    );
    return { events };
  }

  // * Get all events of a given company
  @SetMetadata('roles', [[Status.APPROVED]])
  @Get('company/:companyID')
  async findCompanyEvents(
    @Req() req: ExtendedRequest,
    @Param('companyID') companyID: ObjectId,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const { _id: userID } = req.user.user;
    const events = await this.eventService.findAll(
      page,
      limit,
      userID,
      null,
      null,
      null,
      null,
      null,
      companyID,
    );
    return { events };
  }

  // * Get all events of a given university
  @SetMetadata('roles', [[Status.APPROVED]])
  @Get('university/:universityID')
  async findUniversityEvents(
    @Req() req: ExtendedRequest,
    @Param('universityID') universityID: ObjectId,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const { _id: userID } = req.user.user;
    const events = await this.eventService.findAll(
      page,
      limit,
      userID,
      null,
      null,
      null,
      null,
      null,
      universityID,
    );
    return { events };
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Get('invited')
  async findInvitedEvents(@Req() req: ExtendedRequest) {
    const { _id: userID } = req.user.user;
    const events = await this.eventService.findInvitedEvents(userID);
    return { events };
  }

  @SetMetadata('roles', [[UserRole.STUDENT, Status.APPROVED]])
  @Get('connections/:eventID')
  async getConnections(
    @Param('eventID') eventID: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const { _id: userID, uniID } = req.user.user;
    const connections = await this.eventService.getConnections(
      eventID,
      userID,
      uniID,
    );
    return { connections };
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Get(':id')
  async findOne(@Param('id') id: ObjectId) {
    const event = await this.eventService.findOne(id);
    const output: any = event.toObject();

    const { userStatus, goingCount, interestedCount } =
      this.eventService.getEventStats(event, id);

    output.userStatus = userStatus;
    output.goingCount = goingCount;
    output.interestedCount = interestedCount;

    delete output.interested;
    delete output.going;

    return { event: output };
  }

  @SetMetadata('roles', [[Status.APPROVED]])
  @Get()
  async findAll(
    @Req() req: ExtendedRequest,
    @Query('title', FilterParameterPipe) title: string,
    @Query('start', FilterParameterPipe) start: Date,
    @Query('end', FilterParameterPipe) end: Date,
    @Query('type', FilterParameterPipe) type: EventType,
    @Query('personal', FilterParameterPipe) personal: Boolean,
    @Query('page', PaginationPipe) page: number,
    @Query('limit', PaginationPipe) limit: number,
  ) {
    const { _id: userID, role, uniID } = req.user.user;

    const events = await this.eventService.findAll(
      page,
      limit,
      userID,
      title,
      start,
      end,
      personal,
      type,
      null,
      role === UserRole.STUDENT ? uniID : null,
    );
    const output = events.map((event) => {
      const { userStatus, goingCount, interestedCount } =
        this.eventService.getEventStats(event as unknown as Event, event._id);

      const output: any = event.toObject();
      output.userStatus = userStatus;
      output.going = goingCount;
      output.interested = interestedCount;
      return output;
    });
    return { events: output };
  }

  @Delete(':id')
  remove(
    @Param('id', ObjectIdValidationPipe) id: ObjectId,
    @Req() req: ExtendedRequest,
  ) {
    const userID = req.user.user._id;
    return this.eventService.remove(id, userID);
  }
}
