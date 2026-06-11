import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateScrapeSourceDto } from './dto/create-scrape-source.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateScrapeSourceDto } from './dto/update-scrape-source.dto';
import { ScraperService } from './scraper.service';

@ApiTags('scraper')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('sources')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a scrape source configuration' })
  createSource(
    @Body() dto: CreateScrapeSourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scraperService.createSource(dto, user.id);
  }

  @Get('sources')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List scrape source configurations' })
  findAllSources() {
    return this.scraperService.findAllSources();
  }

  @Get('sources/:id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get a scrape source configuration' })
  findSource(@Param('id') id: string) {
    return this.scraperService.findSource(id);
  }

  @Patch('sources/:id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update a scrape source configuration' })
  updateSource(@Param('id') id: string, @Body() dto: UpdateScrapeSourceDto) {
    return this.scraperService.updateSource(id, dto);
  }

  @Delete('sources/:id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Delete a scrape source configuration' })
  removeSource(@Param('id') id: string) {
    return this.scraperService.removeSource(id);
  }

  @Post('sources/:id/run')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Enqueue a scrape run for a source' })
  runSource(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.scraperService.runSource(id, user.id);
  }

  @Get('jobs')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'List scrape job runs, optionally filtered by source',
  })
  findJobs(@Query('sourceId') sourceId?: string) {
    return this.scraperService.findJobs(sourceId);
  }

  @Get('jobs/:id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get a scrape job run and its stats' })
  findJob(@Param('id') id: string) {
    return this.scraperService.findJob(id);
  }

  @Get('leads')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'List scraped leads' })
  findLeads(@Query() query: QueryLeadsDto) {
    return this.scraperService.findLeads(query);
  }

  @Get('leads/:id')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Get a scraped lead' })
  findLead(@Param('id') id: string) {
    return this.scraperService.findLead(id);
  }

  @Patch('leads/:id/status')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: "Update a lead's pipeline status" })
  updateLeadStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.scraperService.updateLeadStatus(id, dto.status);
  }

  @Patch('leads/:id/assign')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Assign a lead to a user' })
  assignLead(@Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.scraperService.assignLead(id, dto.userId);
  }
}
