export interface CategoryEntityProps {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: CategoryEntity;
  children?: CategoryEntity[];
}

export class CategoryEntity {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly icon: string | null;
  readonly parentId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly parent?: CategoryEntity;
  readonly children?: CategoryEntity[];

  constructor(props: CategoryEntityProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.icon = props.icon;
    this.parentId = props.parentId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.parent = props.parent;
    this.children = props.children;
  }

  isRoot(): boolean {
    return this.parentId === null;
  }

  hasChildren(): boolean {
    return (this.children?.length ?? 0) > 0;
  }
}
