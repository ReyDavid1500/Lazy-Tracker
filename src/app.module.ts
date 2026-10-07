import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/index.js';
import { BusinessModule } from './modules/business/index.js';
import { UsersModule } from './modules/users/index.js';
import { ProductsModule } from './modules/products/index.js';
import { StockModule } from './modules/stock/index.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    BusinessModule,
    UsersModule,
    ProductsModule,
    StockModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally — routes opt out with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply RolesGuard globally — routes opt in with @Roles(...)
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
