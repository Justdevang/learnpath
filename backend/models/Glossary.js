import mongoose from 'mongoose';

const GlossarySchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    definition: {
      type: String,
      required: true,
      minlength: 100,
      maxlength: 500
    },
    description: {
      type: String,
      maxlength: 2000
    },
    category: {
      type: String,
      enum: ['DevOps', 'Microservices', 'Databases', 'Security', 'Programming', 'Frameworks', 'Cloud', 'Architecture', 'Performance', 'Other'],
      required: true,
      index: true
    },
    relatedTerms: [
      {
        type: String,
        lowercase: true
      }
    ],
    example: {
      type: String,
      maxlength: 500
    },
    keywordVariations: [String],
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    published: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Create index for search
GlossarySchema.index({ term: 'text', definition: 'text', description: 'text' });

export default mongoose.model('Glossary', GlossarySchema);
