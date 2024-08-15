import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, ObjectId } from 'mongoose';
import { Comment } from 'src/db/schemas/comments.schema';
import { UserRole } from 'src/enums/user-role.enum';
import { User } from 'src/db/schemas/user.schema';
import { Company } from 'src/db/schemas/company.schema';
import { University } from 'src/db/schemas/university.schema';

type UserSubset = Pick<
  User,
  | 'firstName'
  | 'lastName'
  | 'profilePicture'
  | 'role'
  | 'uniModDetails'
  | 'companyModDetails'
  | '_id'
>;

type CompanySubset = Pick<Company, 'name' | 'logo' | 'description' | '_id'>;

type UniversitySubset = Pick<University, 'name' | 'logo' | 'tagline' | '_id'>;

@Injectable()
export class CommentService {
  constructor(@InjectModel('Comment') private commentModel: Model<Comment>) {}

  async create(
    createCommentDto: CreateCommentDto,
    userID: ObjectId,
    userRole: UserRole,
    companyID: ObjectId,
    uniID: ObjectId,
  ) {
    const { postID, content } = createCommentDto;
    let ownerType = 'User';
    let owner = userID;
    if (userRole === UserRole.COMPANY_ADMIN) {
      ownerType = 'Company';
      owner = companyID;
    } else if (userRole === UserRole.UNI_ADMIN) {
      ownerType = 'University';
      owner = uniID;
    }

    const newComment = new this.commentModel({
      ownerType,
      owner,
      postID,
      // userID,
      content,
    });
    await newComment.save();
    return newComment;
  }

  findOne() {
    return `This action returns one comment`;
  }

  async findAll(postID: ObjectId, page: number, limit: number) {
    const maxLimit = limit;
    const start = (page - 1) * maxLimit;

    const paginationResponse = await this.countComments(
      { postID },
      limit,
      page,
    );

    const comments = await this.commentModel
      .find({ postID })
      .sort({ createdAt: 'asc' })
      .skip(start)
      .limit(maxLimit)
      .populate<{
        owner: UserSubset | CompanySubset | UniversitySubset;
      }>({
        path: 'owner',
        select:
          'firstName lastName profilePicture role name logo tagline email',
        populate: [
          {
            path: 'studentDetails.university',
            select: 'name logo email tagline',
            strictPopulate: false,
          },
          {
            path: 'uniModDetails.uniID',
            select: 'name logo email tagline',
            strictPopulate: false,
          },
          {
            path: 'companyModDetails.companyID',
            select: 'name logo email tagline',
            strictPopulate: false,
          },
        ],
      });

    return { comments, ...paginationResponse };
  }

  async count(postID: ObjectId) {
    return await this.commentModel.countDocuments({ postID });
  }

  async countComments(filter: any, limit: number, page: number) {
    const totalComments = await this.commentModel.countDocuments(filter);
    const totalPages = Math.ceil(totalComments / limit);
    return { totalComments, totalPages, currentPage: page, count: limit };
  }

  async removeUserComments(userID: ObjectId, session: ClientSession) {
    const comments = await this.commentModel.deleteMany(
      { userID },
      { session },
    );
    if (comments) return true;
    else throw new InternalServerErrorException('Error deleting user comments');
  }

  update(id: number, updateCommentDto: UpdateCommentDto) {
    return `This action updates a #${id} comment`;
  }

  remove(id: number) {
    return `This action removes a #${id} comment`;
  }
}
