export interface IBaseRepository<
  T,
  CreateData = Partial<T>,
  UpdateData = Partial<T>,
  ID = string,
> {
  create(data: CreateData): Promise<T>;
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: ID, data: UpdateData): Promise<T>;
  delete(id: ID): Promise<boolean>;
}
