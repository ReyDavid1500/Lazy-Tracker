import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Business } from '../../business/index.js';
import { User } from '../../users/index.js';
import { RegisterDto } from '../dto/request/register.dto.js';
import { LoginDto } from '../dto/request/login.dto.js';
import { AuthResponseDto } from '../dto/response/auth-response.dto.js';
import { JwtPayload } from '../types.js';

const BCRYPT_ROUNDS = 10 as const;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Business.name) private readonly businessModel: Model<Business>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userModel.findOne({ email: dto.email });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const business = await this.businessModel.create({
      name: dto.businessName,
      slug: dto.businessName.toLowerCase().replace(/\s+/g, '-'),
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userModel.create({
      businessId: business._id,
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? 'manager',
    });

    return this.#buildAuthResponse(user, business._id.toString());
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userModel.findOne({ email: dto.email, isActive: true });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.#buildAuthResponse(user, user.businessId.toString());
  }

  #buildAuthResponse(user: User, businessId: string): AuthResponseDto {
    const payload: JwtPayload = {
      userId: (user._id as { toString(): string }).toString(),
      businessId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: payload.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId,
      },
    };
  }
}
