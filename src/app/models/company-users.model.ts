export interface Role {
  id?: number | string;
  name: string;
  description?: string;
  permissions?: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
