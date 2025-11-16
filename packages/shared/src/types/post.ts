export type PostType = 'text' | 'image' | 'journal' | 'poetry' | 'story';
export type PostStatus = 'draft' | 'published' | 'archived';

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  postType: PostType;
  status: PostStatus;
  isPinned: boolean;
  viewCount: number;
  readTimeMinutes?: number;
  language: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostWithAuthor extends Post {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
}

export interface Comment {
  id: string;
  userId: string;
  postId: string;
  parentCommentId?: string;
  content: string;
  likesCount: number;
  dislikesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isPrivate: boolean;
  genreTags: string[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}
