import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import {
  authBodyIdentifierTracker,
  authIpTracker,
} from './common/throttler/auth-throttle.helpers.js';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { SupabaseModule } from './infrastructure/supabase/supabase.module.js';
import { RealtimeModule } from './infrastructure/realtime/realtime.module.js';

// Presentation (feature modules)
import { AuthModule } from './presentation/modules/auth/auth.module.js';
import { ListingModule } from './presentation/modules/listing/listing.module.js';
import { PointsModule } from './presentation/modules/points/points.module.js';
import { ProfileModule } from './presentation/modules/profile/profile.module.js';
import { NotificationsModule } from './presentation/modules/notifications/notifications.module.js';
import { RealtimePresentationModule } from './presentation/modules/realtime/realtime.module.js';

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
      ],
    }),

    // Infrastructure
    DatabaseModule,
    SupabaseModule,
    RealtimeModule,

    // Features
    AuthModule,
    ListingModule,
    PointsModule,
    ProfileModule,
    NotificationsModule,
    RealtimePresentationModule,
    // ─── Future feature modules ───
    // CategoryModule,
    // OfferModule,
    // ChatModule,
    // NotificationModule,
    // ReviewModule,
    // FavoriteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
