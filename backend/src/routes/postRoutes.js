import { Router } from 'express';
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  toggleBookmark,
  toggleLike,
  updatePost
} from '../controllers/postController.js';
import { createComment, deleteComment } from '../controllers/commentController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCommentSchema, commentIdSchema } from '../validators/commentSchemas.js';
import { createPostSchema, idParamSchema, listPostsSchema, updatePostSchema } from '../validators/postSchemas.js';

const router = Router();

router.get('/', optionalAuth, validate(listPostsSchema), listPosts);
router.post('/', protect, validate(createPostSchema), createPost);
router.get('/:slug', optionalAuth, getPost);
router.put('/:id', protect, validate(updatePostSchema), updatePost);
router.delete('/:id', protect, validate(idParamSchema), deletePost);
router.post('/:id/like', protect, validate(idParamSchema), toggleLike);
router.post('/:id/bookmark', protect, validate(idParamSchema), toggleBookmark);
router.post('/:postId/comments', protect, validate(createCommentSchema), createComment);
router.delete('/comments/:id', protect, validate(commentIdSchema), deleteComment);

export default router;
