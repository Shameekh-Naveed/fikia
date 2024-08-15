import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Schema, Types } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { Company } from 'src/db/schemas/company.schema';
import { University } from 'src/db/schemas/university.schema';
import { User } from 'src/db/schemas/user.schema';
import { UserRole } from 'src/enums/user-role.enum';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor(
    @InjectModel('University') private universityModell: Model<University>,
    @InjectModel('User') private userModell: Model<User>,
    @InjectModel('Company') private companyModell: Model<Company>,
    private configService: ConfigService,
  ) {
    const EMAIL_USER = this.configService.get<string>('EMAIL_USER');
    const EMAIL_PASS = this.configService.get<string>('EMAIL_PASS');
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  async sendEmail(subject: string, message: string, senderID: ObjectId) {
    try{
      const SUPER_MAIL = this.configService.get<string>('SUPER_MAIL');
      const text = `Sender ID: ${senderID}\n\n${message}`;
  
      if(SUPER_MAIL){
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: SUPER_MAIL,
        subject,
        text,
      });
 }   }catch(e){
        throw new Error(e)
    }
   
  }

  async paymentVerification(
    userID: Types.ObjectId | Schema.Types.ObjectId,
    date: string,
    amount: number,
    transactionID: string,
  ) {
    const user = await this.userModell.findById(userID);
    const organizationID =
      user.companyModDetails?.companyID || user.uniModDetails?.uniID;
    let organization: University | Company;
    if (user.role === UserRole.COMPANY_ADMIN)
      organization = await this.companyModell.findById(organizationID);
    else organization = await this.universityModell.findById(organizationID);

    const text = `Dear ${organization.name},\n
    I hope this email finds you well. I am writing to inform you that the payment has been successfully completed on ${date}. The amount transferred is ${amount}, and it has been credited to your account\n.
    For your reference, the transaction details are as follows\n:
    
        Date of Payment: ${date} \n
        Amount Transferred: ${amount} \n
        Sender's Name: ${user.firstName} ${user.lastName} \n
        Reference Number (if applicable): ${transactionID}\n
    
    We would like to thank you for your prompt attention to this matter. If you require any further information or documentation regarding this transaction, please do not hesitate to contact us.\n
    Best regards,`;

    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: organization.email,
      subject: 'Payment Successful 🎉',
      text,
    });
    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Payment Successful 🎉',
      text,
    });
  }
}
