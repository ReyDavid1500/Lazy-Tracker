import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Business } from './entities/business.entity.js';

@Injectable()
export class BusinessService {
  constructor(
    @InjectModel(Business.name) private readonly businessModel: Model<Business>,
  ) {}

  async findById(id: string): Promise<Business> {
    const business = await this.businessModel.findById(id);
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }
}
