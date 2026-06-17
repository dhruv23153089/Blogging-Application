import slugify from 'slugify';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

function estimateReadTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

async function uniqueSlug(title, postId) {
  const base = slugify(title, { lower: true, strict: true }) || 'post';
  let slug = base;
  let suffix = 2;

  while (await Post.exists({ slug, _id: { $ne: postId } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function canSeePost(post, user) {
  return post.status === 'published' || (user && post.author._id.toString() === user._id.toString());
}

export const listPosts = asyncHandler(async (req, res) => {
  const { page, limit, search, tag, mine } = req.query;
  const filter = {};

  if (mine === 'true') {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }
    filter.author = req.user._id;
  } else {
    filter.status = 'published';
  }

  if (tag) {
    filter.tags = tag.toLowerCase();
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;
  const [posts, total, tags] = await Promise.all([
    Post.find(filter)
      .sort(search ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name email bio')
      .lean(),
    Post.countDocuments(filter),
    Post.distinct('tags', { status: 'published' })
  ]);

  res.json({
    posts,
    tags: tags.filter(Boolean).sort(),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit))
    }
  });
});

export const createPost = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(req.body.title);
  const post = await Post.create({
    ...req.body,
    tags: req.body.tags.map((tag) => tag.toLowerCase()),
    slug,
    readTime: estimateReadTime(req.body.content),
    publishedAt: req.body.status === 'published' ? new Date() : undefined,
    author: req.user._id
  });

  await post.populate('author', 'name email bio');
  res.status(201).json({ post });
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug }).populate('author', 'name email bio');

  if (!post || !canSeePost(post, req.user)) {
    throw new ApiError(404, 'Post not found.');
  }

  const comments = await Comment.find({ post: post._id }).sort({ createdAt: -1 }).populate('author', 'name');
  res.json({ post, comments });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  if (post.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only edit your own posts.');
  }

  const nextData = { ...req.body };

  if (nextData.title && nextData.title !== post.title) {
    nextData.slug = await uniqueSlug(nextData.title, post._id);
  }

  if (nextData.content) {
    nextData.readTime = estimateReadTime(nextData.content);
  }

  if (nextData.tags) {
    nextData.tags = nextData.tags.map((tag) => tag.toLowerCase());
  }

  if (nextData.status === 'published' && post.status === 'draft') {
    nextData.publishedAt = new Date();
  }

  Object.assign(post, nextData);
  await post.save();
  await post.populate('author', 'name email bio');

  res.json({ post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  if (post.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only delete your own posts.');
  }

  await Comment.deleteMany({ post: post._id });
  await User.updateMany({}, { $pull: { bookmarks: post._id } });
  await post.deleteOne();

  res.json({ message: 'Post deleted.' });
});

export const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  const userId = req.user._id.toString();
  const alreadyLiked = post.likes.some((id) => id.toString() === userId);
  post.likes = alreadyLiked ? post.likes.filter((id) => id.toString() !== userId) : [...post.likes, req.user._id];
  await post.save();

  res.json({ likes: post.likes, liked: !alreadyLiked });
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new ApiError(404, 'Post not found.');
  }

  const userId = req.user._id.toString();
  const alreadySaved = req.user.bookmarks.some((id) => id.toString() === post._id.toString());

  await User.findByIdAndUpdate(userId, {
    [alreadySaved ? '$pull' : '$addToSet']: { bookmarks: post._id }
  });

  res.json({ bookmarked: !alreadySaved });
});
