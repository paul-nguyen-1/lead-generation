import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
    UsersModule,
    EmailModule,
  ],
  controllers: [ScraperController],
  providers: [ScraperService],
})
export class ScraperModule {}
