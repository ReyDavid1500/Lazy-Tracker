import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/index.js';
import { BusinessModule } from './modules/business/index.js';
import { UsersModule } from './modules/users/index.js';
import { ProductsModule } from './modules/products/index.js';
import { StockModule } from './modules/stock/index.js';
import { ScanModule } from './modules/scan/index.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
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
    ScanModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
