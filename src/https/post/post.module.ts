import {
  MiddlewareConsumer,
  Module,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PostSchema } from 'src/db/schemas/post.schema';
import { CommentSchema } from 'src/db/schemas/comments.schema';
import { UserSchema } from 'src/db/schemas/user.schema';
import { UserModule } from '../user/user.module';
import { UniversityModule } from '../university/university.module';
import { CompanyModule } from '../company/company.module';
import { UploadModule } from '../upload/upload.module';
import { GroupModule } from '../group/group.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => UniversityModule),
    // UniversityModule,
    CompanyModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Post', schema: PostSchema },
      { name: 'Comment', schema: CommentSchema },
    ]),
    UploadModule,
    GroupModule,
    // UserModule,
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {}
}
