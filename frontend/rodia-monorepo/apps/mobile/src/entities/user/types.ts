export type UserRole = "shipper" | "driver";

export type User = {
  id: string;
  role: UserRole;

  email?: string;
  name?: string;

  createdAt?: string;
  updatedAt?: string;
};