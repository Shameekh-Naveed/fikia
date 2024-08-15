import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, ObjectId } from 'mongoose';
import { Post } from 'src/db/schemas/post.schema';
import { CommentPostDto } from './dto/comment-post.dto';
import { Comment } from 'src/db/schemas/comments.schema';
import { User } from 'src/db/schemas/user.schema';
import { UserService } from '../user/user.service';
import { UserRole } from 'src/enums/user-role.enum';
import { UniversityService } from '../university/university.service';
import { University } from 'src/db/schemas/university.schema';
import { Company } from 'src/db/schemas/company.schema';
import { CompanyService } from '../company/company.service';
import { PostType } from 'src/enums/post-type.enum';
import { isCompanyManager } from 'src/utils/misc';
import { GroupService } from '../group/group.service';

const postsPerPage = 12;

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
export class PostService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly uniService: UniversityService,
    private readonly companyService: CompanyService,
    private readonly groupService: GroupService,
    @InjectModel('Post') private postModel: Model<Post>,
    @InjectModel('Comment') private commentModel: Model<Comment>,
  ) {
    console.log('Post service initialized');
  }

  async create(
    createPostDto: CreatePostDto,
    userID: ObjectId,
    userRole: UserRole,
    companyID: ObjectId,
    uniID: ObjectId,
  ) {
    // const owner = userID;
    this.validatePostAttributes(createPostDto);

    let ownerType = 'User';
    let owner = userID;
    if (userRole === UserRole.COMPANY_ADMIN) {
      ownerType = 'Company';
      owner = companyID;
    } else if (userRole === UserRole.UNI_ADMIN) {
      ownerType = 'University';
      owner = uniID;
    }

    const {
      title,
      content,
      images,
      isGroupPost,
      groupID,
      postType,
      isEventPost,
      eventID,
    } = createPostDto;

    const post = new this.postModel({
      title,
      content,
      images,
      ownerType,
      owner,
      isGroupPost,
      groupID,
      isEventPost,
      eventID,
      postType,
    });

    await post.save();
    return post._id;
  }

  validatePostAttributes(createPostDto: CreatePostDto) {
    const {
      postType,
      groupID,
      title,
      summary,
      isGroupPost,
      isEventPost,
      eventID,
    } = createPostDto;

    if (isGroupPost && postType === PostType.BLOG_POST)
      throw new BadRequestException('Blogs cannot be group posts');
    else if (isGroupPost && !groupID)
      throw new BadRequestException('Group ID not provided');
    else if (!isGroupPost && groupID) createPostDto.groupID = null;

    if (isEventPost && postType === PostType.BLOG_POST)
      throw new BadRequestException('Blogs cannot be event posts');
    else if (isEventPost && !eventID)
      throw new BadRequestException('Event ID not provided');
    else if (!isEventPost && eventID) createPostDto.eventID = null;

    if (postType === PostType.ARTICLE) {
      if (!title) throw new BadRequestException('Title not provided');
      if (summary) createPostDto.summary = null;
    } else if (postType === PostType.BLOG_POST) {
      if (!title) throw new BadRequestException('Title not provided');
      if (!summary) throw new BadRequestException('Summary not provided');
    }
  }

  async getFeed(page: number, limit: number, userID: ObjectId) {
    const maxLimit = limit || postsPerPage;
    const start = (page - 1) * maxLimit;
    const user = await this.userService.findOne(userID);
    if (!user) throw new UnauthorizedException('User not found');

    const { following, groups, dislikedPosts, followedCompanies, university } =
      user.studentDetails;

    const counsellors = await this.userService.findCounsellors(university);
    const counsellorIDs = counsellors.map((counsellor) => counsellor._id);
    const ownerArr = [
      ...followedCompanies,
      university,
      ...following,
      ...counsellorIDs,
      userID,
    ];
    // TODO: Can/Should be done using aggregations
    // const unlikedPosts = await this.userService.getHiddenPosts(userID);
    const filter = {
      $or: [{ owner: { $in: ownerArr } }, { groupID: { $in: groups } }],
      _id: { $nin: dislikedPosts },
      postType: { $in: [PostType.ARTICLE, PostType.POST] },
    };
    const paginationResponse = await this.countPosts(filter, maxLimit, page);
    const posts = await this.postModel
      .find({
        $or: [{ owner: { $in: ownerArr } }, { groupID: { $in: groups } }],
        _id: { $nin: dislikedPosts },
        postType: { $in: [PostType.ARTICLE, PostType.POST] },
      })
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

    if (!posts || posts.length === 0)
      throw new HttpException('No more posts', HttpStatus.NO_CONTENT);

    const postsObj = posts.map((post) => {
      const likeCount = post.likedBy.length;
      const myLike = post.likedBy.filter(
        (id) => id.toString() === userID.toString(),
      );
      const liked = myLike.length > 0;
      const postObj: any = post.toObject();
      postObj.likeCount = likeCount;
      postObj.liked = liked;
      delete postObj.likedBy;
      return postObj;
    });

    for await (const post of postsObj) {
      const comments = await this.commentModel.countDocuments({
        postID: post._id,
      });
      post.commentCount = comments;
    }

    return { posts: postsObj, ...paginationResponse };
  }

  async fetchUniversityDetails(
    uniID: ObjectId,
    uniDetails: { [key: string]: University },
  ): Promise<University> {
    if (uniDetails[uniID.toString()]) {
      return uniDetails[uniID.toString()];
    } else {
      const uni = await this.uniService.findOne(uniID);
      uniDetails[uniID.toString()] = uni;
      return uni;
    }
  }

  async fetchCompanyDetails(
    companyID: ObjectId,
    companyDetails: { [key: string]: Company },
  ): Promise<Company> {
    if (companyDetails[companyID.toString()]) {
      return companyDetails[companyID.toString()];
    } else {
      const company = await this.companyService.findOne(companyID);
      companyDetails[companyID.toString()] = company;
      return company;
    }
  }

  async findOne(id: ObjectId, requestID: ObjectId) {
    const post = await this.postModel.findById(id).populate<{
      owner: UserSubset | CompanySubset | UniversitySubset;
    }>({
      path: 'owner',
      select: 'firstName lastName profilePicture role name logo tagline email',
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
    if (!post) throw new NotFoundException('Post not found');

    const likeCount = post.likedBy.length;
    const commentCount = await this.commentModel.countDocuments({ postID: id });
    const myLike = post.likedBy.filter(
      (id) => id.toString() == requestID.toString(),
    );
    const liked = myLike.length > 0;
    const postObj: any = post.toObject();
    postObj.likeCount = likeCount;
    postObj.commentCount = commentCount;
    postObj.liked = liked;
    delete postObj.likedBy;
    return postObj;
  }

  // TODO: Check if the requiesting user has access to the posts
  async getUsersPosts(page: number, limit: number, id: ObjectId) {
    const maxLimit = limit || postsPerPage;
    const start = (page - 1) * maxLimit;
    const paginationResponse = await this.countPosts(
      { owner: id },
      maxLimit,
      page,
    );
    const userPosts = await this.postModel
      .find({ owner: id })
      .sort({ createdAt: 'asc' })
      .skip(start)
      .limit(maxLimit)
      .populate('owner');
    if (!userPosts || userPosts.length === 0)
      throw new HttpException('User has no more posts', HttpStatus.NO_CONTENT);
    return { userPosts, ...paginationResponse };
  }

  async likePost(id: ObjectId, userID: ObjectId) {
    const session = await this.postModel.db.startSession();
    session.startTransaction();
    try {
      // Update the users liked posts
      const user = await this.userService.likePost(id, userID, session);

      // Update the post's likedBy
      const post = await this.postModel.findByIdAndUpdate(
        id,
        { $addToSet: { likedBy: userID } }, // Use $addToSet instead of $push
        { session },
      );
      await session.commitTransaction();
      await session.endSession();
      return 'Success';
    } catch {
      await session.abortTransaction();
      session.endSession();
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  // TODO: CHECK IF USER HAS ACCESS TO THE EVENT/USER
  async getPosts(
    page: number,
    limit: number,
    userID: ObjectId,
    eventID: ObjectId,
    groupID: ObjectId,
    uniID: ObjectId,
    requestID: ObjectId,
  ) {
    const user = await this.userService.findOne(requestID);
    if (!user) throw new UnauthorizedException('User not found');

    if (groupID) {
      const access = await this.groupService.checkGroupAccess(
        requestID,
        groupID,
      );
      if (!access)
        throw new UnauthorizedException('You do not have access to this group');
    }

    const {
      following = [],
      groups = [],
      dislikedPosts = [],
      followedCompanies = [],
      university = null,
    } = user.studentDetails || {};

    const maxLimit = limit || postsPerPage;
    const start = (page - 1) * maxLimit;
    const filter = {
      _id: { $nin: dislikedPosts },
      postType: { $in: [PostType.ARTICLE, PostType.POST] },
    };
    if (eventID) filter['eventID'] = eventID;
    if (groupID) filter['groupID'] = groupID;
    if (userID) filter['owner'] = userID;
    if (uniID) filter['owner'] = uniID;

    const paginationResponse = await this.countPosts(filter, maxLimit, page);

    const posts = await this.postModel
      .find(filter)
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
    if (!posts || posts.length === 0)
      throw new HttpException('No more posts', HttpStatus.NO_CONTENT);

    const postsObj = posts.map((post) => {
      const likeCount = post.likedBy.length;
      // const liked = post.likedBy.includes(requestID);
      const myLike = post.likedBy.filter(
        (id) => id.toString() == requestID.toString(),
      );
      const liked = myLike.length > 0;
      const postObj: any = post.toObject();
      postObj.likeCount = likeCount;
      postObj.liked = liked;
      delete postObj.likedBy;
      return postObj;
    });

    for await (const post of postsObj) {
      const comments = await this.commentModel.countDocuments({
        postID: post._id,
      });
      post.commentCount = comments;
    }

    return { posts: postsObj, ...paginationResponse };
  }

  // async commentPost(
  //   id: ObjectId,
  //   commentPostDto: CommentPostDto,
  //   userID: ObjectId,
  // ) {
  //   const { content } = commentPostDto;
  //   const comment = new this.commentModel({
  //     postID: id,
  //     userID,
  //     content,
  //   });
  //   await comment.save();
  //   return comment._id;
  // }

  async removeUserPosts(userID: ObjectId, session: ClientSession) {
    const posts = await this.postModel.deleteMany(
      { owner: userID },
      { session },
    );
    if (!posts) throw new BadRequestException('No posts found');
    else return 'Suceess';
  }

  async countPosts(filter: any, limit: number, page: number) {
    const totalPosts = await this.postModel.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);
    return { totalPosts, totalPages, currentPage: page, count: limit };
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  async remove(id: ObjectId, userID: ObjectId, role: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    // if (role === UserRole.STUDENT && post.owner.toString() != userID.toString())
    if (post.owner.toString() != userID.toString())
      throw new UnauthorizedException(
        'You are not authorized to delete this post',
      );

    const session = await this.postModel.db.startSession();
    session.startTransaction();
    try {
      await this.commentModel.deleteMany({ postID: id }, { session });
      await this.postModel.findByIdAndDelete(id, { session });
      await session.commitTransaction();
      session.endSession();
      return 'Success';
    } catch {
      await session.abortTransaction();
      session.endSession();
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
