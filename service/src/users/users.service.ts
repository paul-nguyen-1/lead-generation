import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { ContractorPermissions, User, UserDocument } from './schemas/user.schema';

const SALT_ROUNDS = 10;

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  permissions: ContractorPermissions;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const existingUsers = await this.userModel.estimatedDocumentCount();
    if (existingUsers > 0) return;

    const email = this.configService.get<string>('SEED_ADMIN_EMAIL');
    const password = this.configService.get<string>('SEED_ADMIN_PASSWORD');
    const name = this.configService.get<string>('SEED_ADMIN_NAME') ?? 'Admin';

    if (!email || !password) {
      this.logger.warn(
        'No users found and SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are not set - skipping admin seed',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.userModel.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: Role.Admin,
    });

    this.logger.log(`Seeded initial admin user: ${email}`);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findAll(role?: Role) {
    return this.userModel.find(role ? { role } : {}).exec();
  }

  findEligibleDrafters() {
    return this.userModel
      .find({
        role: Role.Contractor,
        isActive: true,
        'permissions.leadsAccess': true,
        'permissions.draftEmailAccess': true,
      })
      .exec();
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return this.userModel.create({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userModel.findByIdAndUpdate(userId, { passwordHash }).exec();
  }

  async setRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash }).exec();
  }

  async setActive(userId: string, isActive: boolean): Promise<UserDocument> {
    const update: Partial<User> = { isActive };
    if (!isActive) {
      update.refreshTokenHash = null;
    }
    const user = await this.userModel
      .findByIdAndUpdate(userId, update, { returnDocument: 'after' })
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async setPermissions(
    userId: string,
    permissions: ContractorPermissions,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { permissions }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  toSafeUser(user: UserDocument): SafeUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      permissions: user.permissions ?? { leadsAccess: false, draftEmailAccess: false },
    };
  }
}
