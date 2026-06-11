import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UserDocument } from '../users/schemas/user.schema';
import { UsersService, type SafeUser } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

// Refresh tokens are high-entropy JWTs, so a salted SHA-256 digest is
// sufficient (and avoids bcrypt's 72-byte input truncation, which would
// otherwise make every refresh token for a user hash identically since
// they share the same header + `sub` prefix).
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshTokenMatches(token: string, storedHash: string): boolean {
  const incomingHash = Buffer.from(hashRefreshToken(token), 'hex');
  const expectedHash = Buffer.from(storedHash, 'hex');
  return (
    incomingHash.length === expectedHash.length &&
    timingSafeEqual(incomingHash, expectedHash)
  );
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    const user = await this.usersService.create(dto);
    return this.usersService.toSafeUser(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.usersService.toSafeUser(user) };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResult> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException();
    }

    if (!refreshTokenMatches(refreshToken, user.refreshTokenHash)) {
      throw new UnauthorizedException();
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: this.usersService.toSafeUser(user) };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const userId = user._id.toString();
    const accessTokenPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as JwtSignOptions['expiresIn'],
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: randomUUID() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    const refreshTokenHash = hashRefreshToken(refreshToken);
    await this.usersService.setRefreshTokenHash(userId, refreshTokenHash);

    return { accessToken, refreshToken };
  }
}
