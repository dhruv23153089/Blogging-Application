import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    bookmarks: user.bookmarks
  };
}

export const register = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  const token = signToken(user._id);

  res.status(201).json({ token, user: serializeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');

  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = signToken(user._id);
  user.password = undefined;

  res.json({ token, user: serializeUser(user) });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});
