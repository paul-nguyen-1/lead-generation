import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users, optionally filtered by role' })
  async findAll(@Query('role') role?: Role) {
    const users = await this.usersService.findAll(role);
    return users.map((user) => this.usersService.toSafeUser(user));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  async setStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    const user = await this.usersService.setActive(id, dto.isActive);
    return this.usersService.toSafeUser(user);
  }
}
