import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Company } from 'src/db/schemas/company.schema';
import { Event } from 'src/db/schemas/event.schema';
import { PaymentSession } from 'src/db/schemas/paymentSession.schema';
// import { Student } from 'src/db/schemas/student.schema';
import { University } from 'src/db/schemas/university.schema';
import { User } from 'src/db/schemas/user.schema';
import { Status } from 'src/enums/status.enum';
import { FirebaseService } from 'src/firebase/firebase.service';
import { CompanyService } from 'src/https/company/company.service';
import { VirtualProjectModule } from 'src/https/virtual-project/virtual-project.module';
import { VirtualProjectService } from 'src/https/virtual-project/virtual-project.service';

@Injectable()
export class CronJobsService {
  constructor(
    @InjectModel('University') private universityModel: Model<University>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Company') private companyModel: Model<Company>,
    @InjectModel('Event') private eventModel: Model<Event>,
    @InjectModel('PaymentSession') private sessionModel: Model<PaymentSession>,

    private readonly virtualProjectService: VirtualProjectService,
    private configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async disableStdUni() {
    const UNIVERSITY_MAX_DATE = this.configService.get<number>(
      'UNIVERSITY_MAX_DATE',
    );
    console.log('Checking for students and universities to disable');
    const universities = await this.universityModel.find({
      status: Status.PENDING,
      createdAt: {
        $lt: new Date(Date.now() - UNIVERSITY_MAX_DATE * 24 * 60 * 60 * 1000),
      },
    });
    // Get all the universities IDs
    const uniIds = universities.map((uni) => uni._id);
    console.log("Pending universities' IDs: ", uniIds);
    const students = await this.userModel.find({
      'studentDetails.university': { $in: uniIds },
    });
    console.log('Pending students: ', students.length);
    for await (const uni of universities) {
      uni.status = Status.BLOCKED;
      await uni.save();
    }
    for await (const std of students) {
      std.status = Status.PENDING;
      await std.save();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async universityPayment() {
    const UNIVERSITY_MAX_DATE = this.configService.get<number>(
      'UNIVERSITY_MAX_DATE',
    );
    console.log('Checking for universities to disable');
    const sessions = await this.sessionModel.find({
      status: { $ne: Status.BLOCKED },
      expirationDate: {
        $lte: new Date(Date.now()),
      },
    });
    console.log({ sessions });
    for await (const session of sessions) {
      // Get the number of days left for the session expiration from the UNIVERSITY_MAX_DATE
      const daysPassed = Math.floor(
        (Date.now() - session.expirationDate.getTime()) / (24 * 60 * 60 * 1000),
      );
      const diff = UNIVERSITY_MAX_DATE - daysPassed;
      console.log({ diff, daysPassed });
      if (diff >= 0) {
        // TODO: Send notification to the university and an email maybe
      } else {
        // TODO: Send notification to the university and an email maybe

        // Block the university
        try {
          const university = await this.universityModel.findById(
            session.organizationID,
          );
          university.status = Status.BLOCKED;
          await university.save();

          session.status = Status.BLOCKED;
          await session.save();
        } catch (error) {}
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  expireVirtualProjects() {
    const PROJECT_MAX_DATE = this.configService.get<number>('PROJECT_MAX_DATE');
    const time = new Date(Date.now() - PROJECT_MAX_DATE * 24 * 60 * 60 * 1000);
    this.virtualProjectService.findAndExpire(time);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async eventRemiders() {
    const minTime = new Date(Date.now());
    const maxTime = new Date(Date.now() + 60 * 60 * 1000);
    const events = await this.eventModel.find({
      start: { $gte: minTime, $lt: maxTime },
    });
    // TODO: Send remindernew Date(Date.now() + 60 * 60 * 1000);s to all the users
    for (const event of events) {
      const { title, description, start } = event;
      const notificationTitle = 'Event Reminder: ' + title;
      const notificationBody = `This is a reminder for the event: ${description} starting at ${start.toDateString()}`;
      this.firebaseService.sendNotificationToTopic(
        event._id.toString(),
        notificationTitle,
        notificationBody,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async blockCompanies() {
    const COMPANY_MAX_DATE = this.configService.get<number>('COMPANY_MAX_DATE');
    const time = new Date(Date.now() - COMPANY_MAX_DATE * 24 * 60 * 60 * 1000);
    const companies = await this.companyModel.updateMany(
      { createdAt: { $lt: time }, status: Status.PENDING },
      { $set: { status: Status.BLOCKED } },
    );
    return 'success';
  }
}
