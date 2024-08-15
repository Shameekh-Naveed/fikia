import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import { Status } from 'src/enums/status.enum';
import { EventVisibility } from 'src/enums/event-visibility.enum';
import { FirebaseService } from 'src/firebase/firebase.service';
import { isCompanyEntity, isCompanyManager } from 'src/utils/misc';
import { EventInvitation } from 'src/db/schemas/eventInvitation.schema';
import { Company } from 'src/db/schemas/company.schema';
import { User } from 'src/db/schemas/user.schema';
import { University } from 'src/db/schemas/university.schema';
import { UploadService } from '../upload/upload.service';
import { CompanyService } from '../company/company.service';
import { EventType } from 'src/enums/event-type.enum';
import { Event } from 'src/db/schemas/event.schema';
import { UserService } from '../user/user.service';

@Injectable()
export class EventService {
  constructor(
    @InjectModel('Event') private readonly eventModel: Model<Event>,
    @InjectModel('EventInvitation')
    private readonly invitationModel: Model<EventInvitation>,
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async create(createEventDto: CreateEventDto) {
    const {
      venue,
      description,
      coverPhoto,
      title,
      type,
      eventLink,
      start,
      end,
      host,
      visibility,
      status,
      eventOwner,
      university,
    } = createEventDto;

    const event = new this.eventModel({
      venue,
      description,
      coverPhoto,
      title,
      type,
      eventLink,
      start,
      end,
      host,
      visibility,
      status,
      eventOwner,
      university,
    });
    await event.save();
    return event._id;
  }

  async findAll(
    page: number,
    limit: number,
    userID: ObjectId,
    title?: string,
    start?: Date,
    end?: Date,
    personal?: Boolean,
    type?: EventType,
    companyID?: ObjectId,
    universityID?: ObjectId,
  ) {
    const skip = (page - 1) * limit;

    const invitedEvents = await this.invitationModel.find({ invited: userID });
    const invitedEventIDs = invitedEvents.map(
      (event) => new Types.ObjectId(event.eventID.toString()),
    );

    console.log({ invitedEventIDs });

    const filter: { [key: string]: any } = {
      status: { $ne: Status.BLOCKED },
      $or: [
        { visibility: EventVisibility.PUBLIC },
        { _id: { $in: invitedEventIDs } },
      ],
    };

    this.getFilterQuery(
      title,
      start,
      end,
      companyID,
      universityID,
      userID,
      personal,
      type,
      filter,
    );

    const events = await this.eventModel
      .find(filter)
      .populate<{ university: University }>('university')
      .populate({
        path: 'host',
        select: '-studentDetails -password',
        populate: {
          path: 'companyModDetails.companyID',
        },
      })
      // .lean()
      .skip(skip)
      .limit(limit);

    return events;
  }

  // Get the status of a user in a single event
  getEventStats = (event: Event, userID: ObjectId | Types.ObjectId) => {
    let userStatus = 'none';
    const interested = event.interested.find(
      (id) => id.toString() == userID.toString(),
    );
    if (interested) userStatus = 'interested';
    else {
      const going = event.going.find(
        (id) => id.toString() == userID.toString(),
      );
      if (going) userStatus = 'going';
      else {
        const notInterested = event.notInterested.find((id) => id == userID);
        if (notInterested) userStatus = 'notInterested';
      }
    }
    const goingCount = event.going.length;
    const interestedCount = event.interested.length;

    return { userStatus, goingCount, interestedCount };
  };

  async findOne(
    id: ObjectId,
    populate: boolean = true,
    needHistory: boolean = false,
  ) {
    const select = needHistory ? '' : '-history';
    const event = await this.eventModel.findById(id).select(select);
    if (!event) throw new NotFoundException('Event not found');

    if (populate)
      await event.populate({
        path: 'host',
        select: '-studentDetails -password',
        populate: {
          path: 'companyModDetails.companyID',
        },
      });
    if (populate)
      await event.populate<{ university: University }>('university');

    // const output: Event = event.toObject();

    // const host = event.host as unknown as User;

    // if (host.role === UserRole.UNI_COUNSELOR) {
    //   output.counselor = host;
    //   output.host = event.university;
    // } else if (isCompanyEntity(host.role)) {
    //   // ts will infer companyID as ObjectId, but it is actually a Company
    //   output.host = host.companyModDetails.companyID;
    // }

    return event;
  }

  async updateEventStatus(
    eventID: ObjectId,
    uniID: ObjectId,
    status: Status,
    role: UserRole,
    userID: ObjectId,
    companyID: ObjectId,
  ) {
    const event = await this.findOne(eventID, false);
    // const per
    if (
      role === UserRole.STUDENT &&
      event.host.toString() !== userID.toString()
    )
      throw new BadRequestException('You do not have permission to update');
    event.status = status;
    await event.save();
  }

  async update(
    eventID: ObjectId,
    userID: ObjectId,
    action: 'interested' | 'going' | 'notInterested',
  ) {
    const event = await this.findOne(eventID, false);

    if (event.status === Status.BLOCKED)
      throw new BadRequestException('You can not register for blocked events');

    if (event.visibility !== EventVisibility.PUBLIC) {
      const invited = await this.invitationModel.findOne({ invited: userID });
      if (!invited)
        throw new BadRequestException('You are not invited to this event');
    }

    // Update user's status in the event
    const index = event.interested.indexOf(userID);
    if (index !== -1) event.interested.splice(index, 1);

    const index2 = event.going.indexOf(userID);
    if (index2 !== -1) event.going.splice(index2, 1);

    const index3 = event.notInterested.indexOf(userID);
    if (index3 !== -1) event.notInterested.splice(index3, 1);

    if (action === 'interested') event.interested.push(userID);
    else if (action === 'going') event.going.push(userID);
    else if (action === 'notInterested') event.notInterested.push(userID);
    await event.save();

    if (action === 'going')
      await this.firebaseService.subscribeUserToTopic(
        userID,
        eventID.toString(),
      );

    return 'Success';
  }

  async invite(eventID: ObjectId, userID: ObjectId, inviteID: ObjectId) {
    const event = await this.findOne(eventID, false);

    if (event.status === Status.BLOCKED)
      throw new BadRequestException(
        'You can not register or invite for blocked events',
      );

    const permission = this.checkVisibility(event, userID);
    if (!permission)
      throw new BadRequestException('You do not have permission to invite');

    const invitation = new this.invitationModel({
      invitedBy: userID,
      invited: inviteID,
      eventID,
    });

    await invitation.save();

    // TODO: Fetch device token here
    this.firebaseService.sendNotification(
      inviteID.toString(),
      'Event Invitation',
      `You have been invited to the event: ${event.title}`,
    );

    await event.save();

    return 'Success';
  }

  async checkVisibility(event: Event & any, userID: ObjectId) {
    const goings = event.going.map((id: ObjectId) => id.toString());
    if (event.visibility === EventVisibility.PUBLIC) return true;
    else if (event.host.toString() === userID.toString()) return true;
    else if (goings.includes(userID.toString())) return true;
    else return false;
  }

  async cancelEvent(
    id: ObjectId,
    userID: ObjectId,
    userRole: UserRole,
    companyID?: ObjectId | null,
  ) {
    const event = await this.findOne(id, false);
    if (event.host.toString() != userID.toString())
      throw new BadRequestException(
        'You do not have permission to cancel this event',
      );

    event.status = Status.BLOCKED;
    await event.save();
  }

  async updateEvent(
    id: ObjectId,
    updateEventDto: UpdateEventDto,
    userID: ObjectId,
    userRole: UserRole,
    companyID?: ObjectId | null,
    universityID?: ObjectId | null,
  ) {
    const {
      coverPhoto,
      title,
      description,
      start,
      end,
      type,
      venue,
      eventLink,
      visibility,
      status,
    } = updateEventDto;

    const filter = {
      coverPhoto,
      title,
      description,
      start,
      end,
      type,
      venue,
      eventLink,
      visibility,
      status,
    };

    // Remove all the undefined and empty values from the filter
    Object.keys(filter).forEach(
      (key) => filter[key] === undefined && delete filter[key],
    );

    const event = await this.findOne(id, false, true);

    const permission = this.updatePermission(
      userRole,
      companyID,
      event as unknown,
      userID,
      universityID,
    );
    if (!permission)
      throw new UnauthorizedException('You do not have permission to update');

    Object.keys(filter).forEach((key) => {
      event[key] = filter[key];
      event.history.push({
        changedField: key,
        updatedValue: `${event[key]}`,
        userID,
        createdAt: new Date(),
      });
    });

    await event.save();
    return 'success';

    // return updatedEvent;
  }

  async eventCount(universityID: ObjectId) {
    const events = await this.eventModel.countDocuments({
      university: universityID,
    });
    return events;
  }

  async findInvitedEvents(userID: ObjectId) {
    const events = await this.invitationModel
      .find({ invited: userID })
      .select('-invited')
      .populate({
        path: 'eventID',
        select: '-history',
        populate: {
          path: 'university',
        },
      })
      .populate({
        path: 'invitedBy',
        select: '-password -studentDetails',
      });
    return events;
  }

  async;

  async getConnections(eventID: ObjectId, userID: ObjectId, uniID: ObjectId) {
    const connections = await this.userService.getConnections(userID);
    const event = await this.findOne(eventID, false);
    // if (event.university.toString() !== uniID.toString())
    //   throw new UnauthorizedException('You do not have permission to view');
    const connectionIDs = connections.map((conn) => conn._id.toString());
    const invitations = await this.invitationModel
      .find({ eventID })
      .select('invited');
    const going = event.going.map((id) => id.toString());
    const invited = invitations.map((inv) => inv.invited.toString());
    const output = connections.map((conn) => {
      const id = conn._id.toString();
      const goingStatus = going.includes(id) ? 'going' : 'not going';
      const invitedStatus = invited.includes(id) ? 'invited' : 'not invited';
      return { 
        // ...conn.toObject(),
        goingStatus, invitedStatus };
    });

    return output;
  }

  // * This function has been tailored to work with the updateEvent method.
  // * It is not a general purpose method because of the unknown typed event
  updatePermission(
    userRole: UserRole,
    companyID: ObjectId,
    event,
    userID: ObjectId,
    universityID: ObjectId,
  ) {
    const companyCondition =
      isCompanyManager(userRole) &&
      companyID.toString() == event.host._id.toString();
    const uniCondition =
      userRole === UserRole.UNI_COUNSELOR &&
      event.university._id.toString() === universityID.toString();
    const userCondition = event.host._id.toString() === userID.toString();
    return companyCondition || uniCondition || userCondition;
  }

  getFilterQuery(
    title: string,
    start: Date,
    end: Date,
    companyID: ObjectId,
    universityID: ObjectId,
    userID: ObjectId,
    personal: Boolean,
    type: EventType,
    filter: { [key: string]: any },
  ) {
    if (title) {
      const words = title.split(/\s+/);
      const regexPattern = words.map((word) => new RegExp(word, 'i'));
      filter.title = regexPattern;
    }
    if (start) filter.start = { $gte: start };
    if (end) filter.end = { $lte: end };
    if (companyID) filter.host = companyID;
    if (universityID) filter.university = universityID;
    if (personal) filter.host = userID;
    if (type) filter.type = type;
    // if (personal) {
    // filter.$or = [
    //   { interested: userID },
    //   { going: userID },
    //   { notInterested: userID },
    // ];
    // }
  }

  async remove(id: ObjectId, userID: ObjectId) {
    const event = await this.findOne(id, false);
    if (event.host.toString() !== userID.toString())
      throw new UnauthorizedException('You do not have permission to delete');
    const deletedEvent = await this.eventModel.findByIdAndDelete(id);
    if (!deletedEvent) throw new NotFoundException('Event not found');
    return 'Success';
  }
}
