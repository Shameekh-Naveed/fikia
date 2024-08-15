import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Group } from 'src/db/schemas/group.schema';
import { ClientSession, Model, ObjectId, Types } from 'mongoose';
import { UserService } from '../user/user.service';
import { GroupVisibility } from 'src/enums/group-visibility.enum';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel('Group') private groupModel: Model<Group>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async create(createGroupDto: CreateGroupDto, owner: ObjectId) {
    const { description, title, coverPhoto, visibility } = createGroupDto;
    const group = new this.groupModel({
      owner,
      description,
      title,
      coverPhoto,
      visibility,
    });
    await group.save();
    await this.userService.joinGroup(owner, group._id);
    return group._id;
  }

  async findTrending(userID: ObjectId, page: number, limit: number) {
    const MaxLimit = limit;
    const skip = (page - 1) * MaxLimit;
    const groups = await this.groupModel
      .aggregate([
        {
          $project: {
            _id: 1,
            owner: 1,
            name: 1,
            description: 1,
            coverPhoto: 1,
            title: 1,
            createdAt: 1,
            members: 1,
            memberCount: { $size: '$members' },
          },
        },
        { $sort: { memberCount: -1 } },
      ])
      .skip(skip)
      .limit(MaxLimit);
    groups.forEach((group) => {
      const me = group.members.filter(
        (member) => member.toString() == userID.toString(),
      );
      group.joined = me.length > 0;
      if (group.owner.toString() == userID.toString()) group.owned = true;
      else group.owned = false;
    });
    return groups;
  }

  async findOne(id: ObjectId) {
    const group = await this.groupModel.findById(id);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async checkGroupAccess(userID: ObjectId, groupID: ObjectId) {
    const group = await this.findOne(groupID);
    const me = group.members.filter(
      (member) => member.toString() == userID.toString(),
    );
    if (group.visibility === GroupVisibility.PUBLIC || me.length > 0)
      return true;
    else return false;
  }

  async search(userID: ObjectId, page: number, limit: number, name: string) {
    const MaxLimit = limit;
    const skip = (page - 1) * MaxLimit;
    const words = name.split(/\s+/);

    // Create a regular expression pattern for case-insensitive matching
    const regexPattern = words.map((word) => new RegExp(word, 'i'));

    const groups = await this.groupModel
      .find({ title: regexPattern })
      .skip(skip)
      .limit(MaxLimit);
    const output = groups.map((group) => {
      const memberCount = group.members.length;
      const me = group.members.filter(
        (member) => member.toString() == userID.toString(),
      );
      const joined = me.length > 0;
      return { ...group.toJSON(), memberCount, joined };
    });
    return output;
  }

  update(id: number, updateGroupDto: UpdateGroupDto) {
    return `This action updates a #${id} group`;
  }

  async addMember(
    userID: ObjectId,
    groupID: ObjectId | Types.ObjectId,
    session: any,
  ) {
    const group = await this.groupModel.findByIdAndUpdate(
      groupID,
      { $addToSet: { members: userID } }, // Use $addToSet instead of $push
      { session },
    );
    if (!group) return false;
    else return true;
  }

  async getMembers(groupID: ObjectId, page: number, limit: number) {
    const MaxLimit = limit;
    const skip = (page - 1) * MaxLimit;
    const group = await this.findOne(groupID);
    const totalMembers = group.members.length;
    const totalPages = Math.ceil(totalMembers / MaxLimit);
    await group.populate({
      path: 'members',
      select:
        'firstName lastName email profilePicture studentDetails.university',
      options: { skip, limit: MaxLimit },
      populate: {
        path: 'studentDetails.university',
        select: 'name email tagline logo',
      },
    });
    return { members: group.members, totalMembers, totalPages, page, limit };
  }

  async removeMember_all(userID: ObjectId, session: ClientSession) {
    const group = await this.groupModel.updateMany(
      { $pull: { members: userID } },
      { multi: true },
      { session },
    );
    if (!group) return false;
    else return true;
  }

  async remove(groupID: ObjectId, userID: ObjectId) {
    const group = await this.groupModel.findById(groupID);
    const owner = group.owner.toString();
    if (owner != userID.toString())
      throw new UnauthorizedException(
        'Only the owner of the group can delete it',
      );
    const delGroup = await this.groupModel.findByIdAndDelete(groupID);
    return 'success';
  }
}
