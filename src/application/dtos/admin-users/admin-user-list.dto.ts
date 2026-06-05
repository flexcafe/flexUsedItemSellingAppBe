import { ApiProperty } from '@nestjs/swagger';

export class AdminUserListDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isBanned: boolean;

  @ApiProperty({ nullable: true })
  adminRoleId: string | null;

  @ApiProperty({ nullable: true })
  adminRoleName: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(data: {
    id: string;
    nickname: string;
    phone: string;
    email: string | null;
    isActive: boolean;
    isBanned: boolean;
    adminRoleId: string | null;
    adminRoleName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.nickname = data.nickname;
    this.phone = data.phone;
    this.email = data.email;
    this.isActive = data.isActive;
    this.isBanned = data.isBanned;
    this.adminRoleId = data.adminRoleId;
    this.adminRoleName = data.adminRoleName;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}