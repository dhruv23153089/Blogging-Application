import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 260
    },
    content: {
      type: String,
      required: true,
      minlength: 20
    },
    coverImage: {
      type: String,
      default: ''
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    readTime: {
      type: Number,
      default: 1
    },
    publishedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

postSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });

const Post = mongoose.model('Post', postSchema);

export default Post;
