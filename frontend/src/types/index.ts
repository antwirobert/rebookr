export type Patient = {
  id: string;
  name: string;
  phone: string;
  missedDate: string;
  status: string;
  action: string;
};

export type ListResponse<T = unknown> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
