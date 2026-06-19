import {
  Body,
  Controller,
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
import { CreateLeadDto } from './dto/create-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { SaveDraftEmailDto } from './dto/save-draft-email.dto';
import { ToggleLeadCriterionDto } from './dto/toggle-lead-criterion.dto';
import { UpdateLeadNotesDto } from './dto/update-lead-notes.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('analytics')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Get lead-generation efficiency stats and rankings per contractor',
  })
  getContractorAnalytics() {
    return this.leadsService.getContractorAnalytics();
  }

  @Post()
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Log a new lead' })
  createLead(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.createLead(dto, user.id);
  }

  @Get()
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'List leads' })
  findLeads(@Query() query: QueryLeadsDto) {
    return this.leadsService.findLeads(query);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Get a lead' })
  findLead(@Param('id') id: string) {
    return this.leadsService.findLead(id);
  }

  @Patch(':id/status')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: "Update a lead's pipeline status" })
  updateLeadStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateLeadStatus(id, dto.status);
  }

  @Patch(':id/assign')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Assign a lead to a user' })
  assignLead(@Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.leadsService.assignLead(id, dto.userId);
  }

  @Patch(':id/criteria')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Toggle a review criterion for a lead' })
  toggleLeadCriterion(
    @Param('id') id: string,
    @Body() dto: ToggleLeadCriterionDto,
  ) {
    return this.leadsService.toggleLeadCriterion(id, dto.criterionId);
  }

  @Patch(':id/contractor-notes')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: "Update a lead's contractor notes" })
  setLeadContractorNotes(
    @Param('id') id: string,
    @Body() dto: UpdateLeadNotesDto,
  ) {
    return this.leadsService.setLeadContractorNotes(id, dto.notes);
  }

  @Patch(':id/admin-notes')
  @Roles(Role.Admin)
  @ApiOperation({ summary: "Update a lead's internal admin notes" })
  setLeadAdminNotes(@Param('id') id: string, @Body() dto: UpdateLeadNotesDto) {
    return this.leadsService.setLeadAdminNotes(id, dto.notes);
  }

  @Patch(':id/draft-email')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Save or update a draft outreach email for a lead' })
  saveDraftEmail(
    @Param('id') id: string,
    @Body() dto: SaveDraftEmailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.saveDraftEmail(
      id,
      dto.subject,
      dto.body,
      user.id,
      user.role,
    );
  }

  @Patch(':id/auto-assign-draft')
  @Roles(Role.Admin)
  @ApiOperation({
    summary:
      'Auto-assign a lead to the eligible contractor with the fewest current leads',
  })
  autoAssignDraft(@Param('id') id: string) {
    return this.leadsService.autoAssignDraft(id);
  }

  @Patch(':id/submit')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Submit a lead for admin approval' })
  submitLeadForApproval(@Param('id') id: string) {
    return this.leadsService.submitLeadForApproval(id);
  }

  @Patch(':id/send-back')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Send a lead back to the contractor for more review',
  })
  sendLeadBackToContractor(@Param('id') id: string) {
    return this.leadsService.sendLeadBackToContractor(id);
  }

  @Patch(':id/approve')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Approve a lead and mark its email as sent' })
  approveLead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.approveLead(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(Role.Admin, Role.Contractor)
  @ApiOperation({ summary: 'Reject a lead' })
  rejectLead(@Param('id') id: string) {
    return this.leadsService.rejectLead(id);
  }
}
