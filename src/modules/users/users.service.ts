import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import type { CreateWorkerDto } from './dto/create-worker.dto.js';
import type { WorkerResponseDto } from './dto/worker-response.dto.js';
import { AuthService } from '../auth/services/auth.service.js';
import { Business } from '../business/index.js';

const BCRYPT_ROUNDS = 10 as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Business.name) private readonly businessModel: Model<Business>,
    private readonly authService: AuthService,
  ) {}

  async createWorker(
    dto: CreateWorkerDto,
    businessId: string,
  ): Promise<WorkerResponseDto> {
    const business = await this.businessModel.findById(businessId);

    if (!business) {
      throw new ConflictException('Business not found');
    }

    const baseUserName = this.authService.generateUserName(dto.name, business.name);

    // Ensure userName uniqueness by appending a counter if needed
    let userName = baseUserName;
    let attempt = 1;
    while (await this.userModel.findOne({ userName })) {
      userName = `${baseUserName}${attempt}`;
      attempt++;
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const worker = await this.userModel.create({
      businessId,
      name: dto.name,
      email: null,
      userName,
      passwordHash,
      role: 'worker',
    });

    return {
      id: (worker._id as { toString(): string }).toString(),
      name: worker.name,
      userName,
      role: 'worker',
      businessId,
    };
  }
}
