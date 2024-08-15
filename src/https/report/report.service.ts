import { Inject, Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { Report } from 'src/db/schemas/report.schema';
import { UserRole } from 'src/enums/user-role.enum';
import { ReportStatus } from 'src/enums/report-status.enum';

@Injectable()
export class ReportService {
  constructor(@InjectModel('Report') private reportModel: Model<Report>) {}

  async report(
    userID: ObjectId,
    entity: 'user' | 'post' | 'event',
    id: ObjectId,
    createReportDto: CreateReportDto,
  ) {
    const { reason } = createReportDto;
    const category =
      entity === 'user' ? 'User' : entity === 'post' ? 'Post' : 'Event';
    const report = new this.reportModel({
      reportedBy: userID,
      reason,
      category,
      reportedObj: id,
    });
    await report.save();
    return report;
  }

  async findAllStudents(uniID: ObjectId, role: UserRole) {
    const aggregationPipeline: any = [
      {
        $match: {
          category: 'User',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reportedObj',
          foreignField: '_id',
          as: 'user',
        },
      },
    ];
    if (role === UserRole.UNI_ADMIN)
      aggregationPipeline.push({
        $match: {
          'user.studentDetails.university': new Types.ObjectId(
            uniID.toString(),
          ),
        },
      });
    aggregationPipeline.push({
      $project: {
        'user.password': 0,
        'user.phoneNumber': 0,
        'user.studentDetails': 0,
      },
    });
    const reports = await this.reportModel.aggregate(aggregationPipeline);
    return reports;
  }

  async findOne(id: ObjectId) {
    const report = await this.reportModel.findById(id).populate({
      path: 'reportedObj',
      select: '-password -phoneNumber -studentDetails -likedBy -content',
    });
    return report;
  }

  async findAllPosts() {
    const reports = await this.reportModel.find({ category: 'Post' }).populate({
      path: 'reportedObj',
      select: '-password -phoneNumber -studentDetails -likedBy -content',
    });
    return reports;
  }

  async findAllEvents() {
    const reports = await this.reportModel
      .find({ category: 'Event' })
      .populate({
        path: 'reportedObj',
        select: '-interested -going -notInterested',
      });
    return reports;
  }

  async resolve(id: ObjectId) {
    const report = await this.reportModel.findByIdAndUpdate(
      id,
      { status: ReportStatus.RESOLVED },
      { new: true },
    );
    return 'Success';
  }

  remove(id: number) {
    return `This action removes a #${id} report`;
  }
}
