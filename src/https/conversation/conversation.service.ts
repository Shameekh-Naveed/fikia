import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { Conversation, Participant } from 'src/db/schemas/conversations.schema';
import { UserService } from '../user/user.service';
import { firebaseAdmin } from '../../firebase.config';
import { MessageParticipantType } from 'src/enums/entity.enum';
import { CompanyService } from '../company/company.service';
import { UniversityService } from '../university/university.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel('Conversation')
    private readonly conversationModel: Model<Conversation>,
    private readonly userService: UserService,
    private readonly companyService: CompanyService,
    private readonly universityService: UniversityService,
  ) {}

  async create(
    createConversationDto: CreateConversationDto,
    userID: ObjectId,
    userType: MessageParticipantType,
  ) {
    const { partnerID, partnerRole } = createConversationDto;

    // const partner = await this.userService.fetchPartnerID(
    //   partnerID,
    //   partnerRole,
    // );
    const participants = [
      { refType: userType, participantID: userID },
      { refType: partnerRole, participantID: partnerID },
    ];

    const existingConvo = await this.conversationModel.findOne({
      'participants.participantID': { $all: [userID, partnerID] },
    });

    if (existingConvo) return existingConvo;
    // const room = await this.createRoom([userID, partnerID]);
    const roomID = '10';
    const convo = new this.conversationModel({
      participants,
      roomID,
    });
    await convo.save();
    return 'success';
  }

  async createRoom(participants: ObjectId[]) {
    const strParticipants = participants.map((p) => p.toString());
    const db = firebaseAdmin.firestore();
    const convo = await db.collection('conversations').add({
      strParticipants,
    });
    return convo;
  }

  // ! Uses the previous implementation where the conversation was created for owners only
  async findAll_EX(userID: ObjectId, userRole: string) {
    // * For some (not so odd) reason this gives a seperate conversation
    // * for each participant, hence the merge function below
    // TODO: The key to fixing this is (probably) fixing the group by in the aggregation
    const conversations = await this.conversationModel.aggregate([
      {
        $match: {
          participants: {
            $elemMatch: { $eq: new Types.ObjectId(userID.toString()) },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participantsInfo',
        },
      },
      {
        $unwind: '$participantsInfo',
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'participantsInfo.companyModDetails.companyID',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $unwind: {
          path: '$company',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'universities',
          localField: 'participantsInfo.uniModDetails.uniID',
          foreignField: '_id',
          as: 'university',
        },
      },
      {
        $unwind: {
          path: '$university',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          participants: 1,
          'participantsInfo._id': 1,
          'participantsInfo.firstName': 1,
          'participantsInfo.lastName': 1,
          'participantsInfo.profilePicture': 1,
          'participantsInfo.role': 1,
          'participantsInfo.companyModDetails.companyID': 1,
          'participantsInfo.uniModDetails.uniID': 1,

          'company._id': 1,
          'company.name': 1,
          'company.description': 1,
          'company.logo': 1,

          'university._id': 1,
          'university.name': 1,
          'university.tagline': 1,
          'university.logo': 1,
        },
      },
    ]);

    // * Convert some data items to an array
    const modifiedConversations = [...conversations];

    modifiedConversations.forEach((conversation) => {
      conversation.participantsInfo = [conversation.participantsInfo];
      conversation.companies = [conversation.company];
      conversation.universities = [conversation.university];
      delete conversation.university;
      delete conversation.company;
    });

    // * Merge all the conversations with same ID
    const mergedConversations = modifiedConversations.reduce((acc, curr) => {
      const existing = acc.find(
        (conversation) => conversation._id.toString() === curr._id.toString(),
      );

      // Preserve participantsInfo from every object
      if (existing) {
        existing.participantsInfo.push(...curr.participantsInfo);
        existing.companies.push(...curr.companies);
        existing.universities.push(...curr.universities);
      } else acc.push(curr);
      return acc;
    }, []);

    // * Remove nulls
    // mergedConversations.forEach((conversation) => {});

    return mergedConversations;
  }

  // TODO: Dont need to populate requesting user repeatedly
  // TODO: Limit the number of messages returned here
  async findAll(userID: ObjectId) {
    const conversations = await this.conversationModel.find({
      'participants.participantID': userID,
    });

    const allParticipants: Participant[] = conversations.reduce((acc, curr) => {
      acc.push(...curr.participants);
      return acc;
    }, []);

    const participantsPromise = allParticipants.map((participant) => {
      return this.populateParticipant(participant);
    });

    const participants = await Promise.all(participantsPromise);

    const output = conversations.map((conversation, index) => {
      const participantIDs = conversation.participants.map(
        (participant) => participant.participantID,
      );
      const participantsH = participants.filter((participant) =>
        participantIDs.includes(participant._id),
      );
      return {
        ...conversation.toObject(),
        participants,
      };
    });

    return output;
  }

  async populateParticipant(participant: Participant) {
    switch (participant.refType) {
      case MessageParticipantType.USER:
        const user = await this.userService.findOne(participant.participantID);
        const output = user.toObject();
        delete output.password;
        delete output.studentDetails;
        return output;
        break;
      case MessageParticipantType.COMPANY:
        return await this.companyService._findOne_(participant.participantID);
        break;
      case MessageParticipantType.UNIVERSITY:
        return await this.universityService._findOne_(
          participant.participantID,
        );
        break;
    }
  }

  async addMessage(
    conversationId: ObjectId,
    userID: ObjectId,
    messageBody: { content?: string; attachment?: string },
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    const { content, attachment } = messageBody;

    const message = {
      sender: userID,
      content,
      attachment,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date(); // Update conversation's updatedAt timestamp

    await conversation.save();

    return 'success';
  }

  async getMessages(
    conversationID: ObjectId,
    requestID: ObjectId,
    page: number,
    limit: number,
  ) {
    const conversation = await this.findOne(
      conversationID,
      requestID,
      page,
      limit,
    );

    return conversation.messages;
  }

  // TODO: Populate the participants
  async findOne(
    conversationID: ObjectId,
    requestID: ObjectId,
    page: number,
    limit: number,
  ) {
    const number = page * limit;
    const conversation = await this.conversationModel
      .findById(conversationID)
      .slice('messages', -number); // Limit the messages array to latest n messages
    // .sort({ 'messages.createdAt': 1 }); // Sort the messages array in ascending order

    if (!conversation) throw new NotFoundException('Conversation not found');

    // .includes method does not seem to work with objectIds
    const permission = conversation.participants.some(
      (participant) =>
        participant.participantID.toString() === requestID.toString(),
    );
    if (!permission) throw new NotFoundException('Conversation not found');
    const messageCount = conversation.messages.length;
    // Get the last 5 messages
    const lastMessages = conversation.messages.slice(
      messageCount - 5,
      messageCount,
    );
    const output = {
      ...conversation.toObject(),
      messageCount,
      lastMessages,
    };
    return output;
  }

  update(id: number, updateConversationDto: UpdateConversationDto) {
    return `This action updates a #${id} conversation`;
  }

  remove(id: number) {
    return `This action removes a #${id} conversation`;
  }
}
