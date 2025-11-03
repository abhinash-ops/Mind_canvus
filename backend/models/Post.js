const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Entertainment', 'Education', 'Fun', 'Movies', 'Technology', 'Lifestyle', 'Travel', 'Food', 'Sports', 'Other'],
    default: 'Other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  featuredImage: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  scheduledFor: {
    type: Date
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  readTime: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, status: 1, publishedAt: -1 });
postSchema.index({ status: 1, scheduledFor: 1 });


// Virtual for likes count
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for comments count (will be populated from Comment model)
postSchema.virtual('commentsCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Pre-save middleware to generate slug and calculate read time
postSchema.pre('save', function(next) {
  // Generate slug if not exists
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  
  // Calculate read time (average reading speed: 200 words per minute)
  const wordCount = this.content.split(/\s+/).length;
  this.readTime = Math.ceil(wordCount / 200);
  
  // Set publishedAt if status is published and not already set
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Method to check if user has liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to toggle like
postSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.findIndex(like => like.user.toString() === userId.toString());
  
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    return false; // unliked
  } else {
    this.likes.push({ user: userId });
    return true; // liked
  }
};

// Method to increment views
postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to get published posts
postSchema.statics.getPublishedPosts = function(options = {}) {
  const query = {
    status: 'published',
    publishedAt: { $lte: new Date() }
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.author) {
    query.author = options.author;
  }
  
  return this.find(query)
    .populate('author', 'username firstName lastName avatar')
    .sort({ publishedAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0);
};

// Static method to get scheduled posts that should be published
postSchema.statics.getScheduledPostsToPublish = function() {
  return this.find({
    status: 'scheduled',
    scheduledFor: { $lte: new Date() }
  });
};

module.exports = mongoose.model('Post', postSchema);
