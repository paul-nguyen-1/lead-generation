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
import { GenerateLeadsDto } from './dto/generate-leads.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ToggleLeadCriterionDto } from './dto/toggle-lead-criterion.dto';
import { UpdateLeadNotesDto } from './dto/update-lead-notes.dto';
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

  @Post('generate')
  @Roles(Role.Admin)
  @ApiOperation({
    summary:
      'Run the scraper against the most recently created active source, capped at a number of new leads',
  })
  generateLeads(
    @Body() dto: GenerateLeadsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scraperService.generateLeads(user.id, dto.limit);
  }

  @Get('generate/status')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Get the status of the latest scrape job' })
  getGenerationStatus() {
    return this.scraperService.getGenerationStatus();
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

  @Patch('leads/:id/criteria')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Toggle a review criterion for a lead' })
  toggleLeadCriterion(
    @Param('id') id: string,
    @Body() dto: ToggleLeadCriterionDto,
  ) {
    return this.scraperService.toggleLeadCriterion(id, dto.criterionId);
  }

  @Patch('leads/:id/contractor-notes')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: "Update a lead's contractor notes" })
  setLeadContractorNotes(
    @Param('id') id: string,
    @Body() dto: UpdateLeadNotesDto,
  ) {
    return this.scraperService.setLeadContractorNotes(id, dto.notes);
  }

  @Patch('leads/:id/admin-notes')
  @Roles(Role.Admin)
  @ApiOperation({ summary: "Update a lead's internal admin notes" })
  setLeadAdminNotes(@Param('id') id: string, @Body() dto: UpdateLeadNotesDto) {
    return this.scraperService.setLeadAdminNotes(id, dto.notes);
  }

  @Patch('leads/:id/submit')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Submit a lead for admin approval' })
  submitLeadForApproval(@Param('id') id: string) {
    return this.scraperService.submitLeadForApproval(id);
  }

  @Patch('leads/:id/send-back')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Send a lead back to the contractor for more review',
  })
  sendLeadBackToContractor(@Param('id') id: string) {
    return this.scraperService.sendLeadBackToContractor(id);
  }

  @Patch('leads/:id/approve')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Approve a lead and mark its email as sent' })
  approveLead(@Param('id') id: string) {
    return this.scraperService.approveLead(id);
  }

  @Patch('leads/:id/reject')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Reject a lead' })
  rejectLead(@Param('id') id: string) {
    return this.scraperService.rejectLead(id);
  }
}
