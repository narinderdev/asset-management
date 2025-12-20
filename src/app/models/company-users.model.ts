export interface Role {
  id?: number | string;
  name: string;
  description?: string;
  permissions?: string[];
  permissionCodes?: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
