import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Glossary from '../models/Glossary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnpath')
  .then(() => console.log('✓ MongoDB connected'))
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err);
    process.exit(1);
  });

async function seedGlossary() {
  try {
    console.log('📝 Reading glossary data...');
    const dataPath = path.join(__dirname, '../data/glossaryTerms.json');
    const glossaryData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📊 Found ${glossaryData.length} glossary terms`);

    // Clear existing glossary (optional - comment out to preserve)
    // await Glossary.deleteMany({});
    // console.log('✓ Cleared existing glossary');

    // Insert terms
    const inserted = await Glossary.insertMany(glossaryData, { ordered: false });
    console.log(`✅ Successfully inserted ${inserted.length} glossary terms`);

    // Show statistics
    const stats = await Glossary.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📚 Glossary by Category:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} terms`);
    });

    const total = await Glossary.countDocuments();
    console.log(`\n📈 Total glossary terms: ${total}`);

    process.exit(0);
  } catch (error) {
    if (error.code === 11000) {
      console.warn('⚠️  Some terms already exist. Run with deleteMany() to replace.');
    } else {
      console.error('✗ Error seeding glossary:', error.message);
    }
    process.exit(1);
  }
}

seedGlossary();
