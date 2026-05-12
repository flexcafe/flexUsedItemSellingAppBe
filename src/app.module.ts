import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {
  authBodyIdentifierTracker,
  authIpTracker,
} from './common/throttler/auth-throttle.helpers.js';
import { jwtUserSubTracker } from './common/throttler/jwt-user-throttle.helper.js';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { SupabaseModule } from './infrastructure/supabase/supabase.module.js';
import { RealtimeModule } from './infrastructure/realtime/realtime.module.js';

// Presentation (feature modules)
import { AuthModule } from './presentation/modules/auth/auth.module.js';
import { PointsModule } from './presentation/modules/points/points.module.js';
import { ProfileModule } from './presentation/modules/profile/profile.module.js';
import { NotificationsModule } from './presentation/modules/notifications/notifications.module.js';
import { RealtimePresentationModule } from './presentation/modules/realtime/realtime.module.js';
import { SliderAdsModule } from './presentation/modules/slider-ads/slider-ads.module.js';
import { CategoryModule } from './presentation/modules/category/category.module.js';
import { ProductModule } from './presentation/modules/product/product.module.js';
import { VpnRestrictionGuard } from './common/guards/vpn-restriction.guard.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'auth-ip',
          ttl: 60_000,
          limit: 30,
          getTracker: authIpTracker,
        },
        {
          name: 'auth-id',
          ttl: 60_000,
          limit: 10,
          getTracker: authBodyIdentifierTracker,
        },
        // Client actions that fan out admin notifications (presentation-layer limits; see architecture.md)
        {
          name: 'admin-notify-ip',
          ttl: 60_000,
          limit: 40,
          getTracker: authIpTracker,
        },
        {
          name: 'admin-notify-user',
          ttl: 3_600_000,
          limit: 15,
          getTracker: jwtUserSubTracker,
        },
        {
          name: 'review-submit-ip',
          ttl: 60_000,
          limit: 60,
          getTracker: authIpTracker,
        },
        {
          name: 'review-submit-user',
          ttl: 3_600_000,
          limit: 80,
          getTracker: jwtUserSubTracker,
        },
      ],
    }),

    // Infrastructure
    DatabaseModule,
    SupabaseModule,
    RealtimeModule,

    // Features
    AuthModule,
    PointsModule,
    ProfileModule,
    NotificationsModule,
    RealtimePresentationModule,
    SliderAdsModule,
    CategoryModule,
    ProductModule,
    // ─── Future feature modules ───
    // CategoryModule,
    // OfferModule,
    // ChatModule,
    // NotificationModule,
    // ReviewModule,
    // FavoriteModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: VpnRestrictionGuard,
    },
  ],
})
export class AppModule {}
