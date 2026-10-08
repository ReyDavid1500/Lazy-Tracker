import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
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
    const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase() });

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
      email: dto.email.toLowerCase(),
      userName: this.generateUserName(dto.name, dto.businessName),
      passwordHash,
      role: 'manager',
    });

    return this.#buildAuthResponse(user, business._id.toString());
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Determine if identifier looks like an email
    const isEmail = dto.identifier.includes('@');

    const query: QueryFilter<User> = isEmail
      ? { email: dto.identifier.toLowerCase(), isActive: true }
      : { userName: dto.identifier, isActive: true };

    const user = await this.userModel.findOne(query);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.#buildAuthResponse(user, user.businessId.toString());
  }

  /**
   * Generates a userName from the worker's full name and the business name.
   * Formula: firstLetter(firstName) + lowercase(surname) + capitalize(first word of businessName)
   * Example: "David Guzman" + "One Bakery" → "DguzmanOne"
   */
  generateUserName(workerName: string, businessName: string): string {
    const nameParts = workerName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const surname = nameParts[1] ?? nameParts[0] ?? '';

    const firstLetter = firstName.charAt(0).toUpperCase();
    const lowercaseSurname = surname.toLowerCase();

    const businessFirstWord = businessName.trim().split(/\s+/)[0] ?? businessName;
    const capitalizedBusiness =
      businessFirstWord.charAt(0).toUpperCase() + businessFirstWord.slice(1).toLowerCase();

    return `${firstLetter}${lowercaseSurname}${capitalizedBusiness}`;
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
        email: user.email || '',
        userName: user.userName,
        role: user.role,
        businessId,
      },
    };
  }
}
