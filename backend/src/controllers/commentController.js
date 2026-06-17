import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';

export const createComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);

  if (!post || post.status !== 'published') {
    throw new ApiError(404, 'Post not found.');
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    body: req.body.body
  });

  await comment.populate('author', 'name');
  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id).populate('post', 'author');

  if (!comment) {
    throw new ApiError(404, 'Comment not found.');
  }

  const isCommentOwner = comment.author.toString() === req.user._id.toString();
  const isPostOwner = comment.post.author.toString() === req.user._id.toString();

  if (!isCommentOwner && !isPostOwner) {
    throw new ApiError(403, 'You cannot delete this comment.');
  }

  await comment.deleteOne();
  res.json({ message: 'Comment deleted.' });
});
