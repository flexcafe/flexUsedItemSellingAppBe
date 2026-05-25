import { Module } from '@nestjs/common';
import { ClientProductsController } from './client-products.controller.js';
import { ProductRepository } from '../../../infrastructure/repositories/product.repository.js';
import { CategoryRepository } from '../../../infrastructure/repositories/category.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface.js';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { FILE_STORAGE } from '../../../domain/services/file-storage.interface.js';
import { SupabaseFileStorageService } from '../../../infrastructure/storage/supabase-file-storage.service.js';
import { CreateProductUseCase } from '../../../application/use-cases/product/create-product.use-case.js';
import { ListProductsUseCase } from '../../../application/use-cases/product/list-products.use-case.js';
import { GetProductDetailUseCase } from '../../../application/use-cases/product/get-product-detail.use-case.js';
import { GetMyProductDetailUseCase } from '../../../application/use-cases/product/get-my-product-detail.use-case.js';
import { ListMyProductsUseCase } from '../../../application/use-cases/product/list-my-products.use-case.js';
import { SetActiveDealUseCase } from '../../../application/use-cases/product/set-active-deal.use-case.js';
import { UpdateProductUseCase } from '../../../application/use-cases/product/update-product.use-case.js';
import { DeleteProductUseCase } from '../../../application/use-cases/product/delete-product.use-case.js';
import { UploadProductMediaUseCase } from '../../../application/use-cases/product/upload-product-media.use-case.js';
import { PointsRepository } from '../../../infrastructure/repositories/points.repository.js';
import { ChatRepository } from '../../../infrastructure/repositories/chat.repository.js';
import { POINTS_REPOSITORY } from '../../../domain/repositories/points.repository.interface.js';
import { CHAT_REPOSITORY } from '../../../domain/repositories/chat.repository.interface.js';

@Module({
  controllers: [ClientProductsController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    GetProductDetailUseCase,
    GetMyProductDetailUseCase,
    ListMyProductsUseCase,
    SetActiveDealUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    UploadProductMediaUseCase,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductRepository,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: FILE_STORAGE,
      useClass: SupabaseFileStorageService,
    },
    {
      provide: POINTS_REPOSITORY,
      useClass: PointsRepository,
    },
    {
      provide: CHAT_REPOSITORY,
      useClass: ChatRepository,
    },
  ],
})
export class ProductModule {}
