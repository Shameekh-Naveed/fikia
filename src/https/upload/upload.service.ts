import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    // Create an uploads folder if it does not exist
    const uploadsFolder = path.join(__dirname, '../../../uploads');
    console.log({ uploadsFolder });
    if (!fs.existsSync(uploadsFolder)) {
      console.log('had to make folder');
      fs.mkdirSync(uploadsFolder);
    }
  }
  // TODO: Should be able to delete a set of files
  // TODO: Implement strategy to deal with files that are uploaded but
  // TODO: not used within 10 minutes of upload. Delete them maybe or mark them as trash
  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('No file provided');

    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join('uploads', fileName);

    await this.writeFile(file, filePath);
    const HOST = this.configService.get<number>('HOST');
    return HOST + filePath;
  }

  async saveFiles(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || !files.length)
      throw new BadRequestException('No files provided');

    const filePaths = await Promise.all(
      files.map((file) => this.saveFile(file)),
    );

    return filePaths;
  }

  async parseExcelFile(file: Express.Multer.File) {
    if (
      file.mimetype !== 'application/vnd.ms-excel' &&
      file.mimetype !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      !file.originalname.endsWith('.xls') &&
      !file.originalname.endsWith('.xlsx')
    )
      throw new BadRequestException('Please provide a valid excel file');
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });

      // Assuming there's only one sheet in the Excel file, you can access it by its index
      // const sheetName = workbook.SheetNames[0];
      // const sheet = workbook.Sheets[sheetName];

      const sheetNames = workbook.SheetNames;
      const output: any[] = [];
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data: string[] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        const headers = [...data[0]];
        data.shift();
        const outputData = data.map((row: any) => {
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            const key = this.getKey(header);
            if (key === 'dateOfBirth')
              obj[key] = this.convertToDate(row[index]);
            else obj[key] = row[index];
          });
          return obj;
        });
        output.push(...outputData);
      }

      return output;
    } catch (error) {
      const message = error.message || 'Error while parsing the excel file';
      throw new BadRequestException(message);
    }
  }

  convertToDate(date: string) {
    try {
      if (!date || date === '') throw new Error('Invalid date format');
      const ouput = new Date(date);
      return ouput;
    } catch (error) {
      throw new BadRequestException(
        'Invalid date format. It should be in the format MOTNH DD YYYY. Eg: Dec 21 2002',
      );
    }
  }

  getKey(_header: string) {
    const header = _header.toLowerCase();
    switch (header) {
      case 'first name':
        return 'firstName';
        break;
      case 'last name':
        return 'lastName';
        break;
      case 'email':
        return 'email';
        break;
      case 'id':
        return 'id';
        break;
      case 'dob':
        return 'dateOfBirth';
        break;
      default:
        return header;
        break;
    }
  }

  private async writeFile(
    file: Express.Multer.File,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const fileExtension = path.extname(originalName);
    return `${timestamp}-newFile${fileExtension}`;
  }
}
