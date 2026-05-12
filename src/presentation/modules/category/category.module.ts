import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller.js';
import { ClientCategoriesController } from './client-categories.controller.js';
import { CategoryRepository } from '../../../infrastructure/repositories/category.repository.js';
import { UserRepository } from '../../../infrastructure/repositories/user.repository.js';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface.js';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface.js';
import { CreateCategoryUseCase } from '../../../application/use-cases/category/create-category.use-case.js';
import { UpdateCategoryUseCase } from '../../../application/use-cases/category/update-category.use-case.js';
import { DeleteCategoryUseCase } from '../../../application/use-cases/category/delete-category.use-case.js';
import { GetCategoryUseCase } from '../../../application/use-cases/category/get-category.use-case.js';
import { ListCategoriesUseCase } from '../../../application/use-cases/category/list-categories.use-case.js';

@Module({
  controllers: [AdminCategoriesController, ClientCategoriesController],
  providers: [
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: CategoryRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
})
export class CategoryModule {}
