export interface Photo {
  id: string;
  uid: string;
  imageUrl: string;
  category: string;
  tags: string[] | null;
  createdAt: number;
  views: number;
  likes: number;
}

export interface User {
  name: string | null;
  uid: string;
  email: string;
  numberOfUploads: number;
  totalViews: number;
  totalLikes: number;
}

export interface PhotoWithUser {
  photo: Photo;
  user: User;
  hasLiked: boolean;
}

export interface CategoriesResponse {
  [category: string]: PhotoWithUser[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface Like {
  uid: string;
  photoId: string;
  createdAt: number;
}
