import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportSchema } from 'src/db/schemas/report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Report',
        schema: ReportSchema,
      },
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
