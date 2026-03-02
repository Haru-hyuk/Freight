export type UserRole = "shipper" | "driver";

export type User = {
  id: string;
  role: UserRole;

  email?: string;
  name?: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;

  createdAt?: string;
  updatedAt?: string;
};
