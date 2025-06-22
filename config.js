// Supabase configuration
const SUPABASE_CONFIG = {
  url: 'https://gvxjveicefxhykjwngeq.supabase.co', // Replace with your Supabase project URL
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2eGp2ZWljZWZ4aHlranduZ2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTUwMjAsImV4cCI6MjA2NjA5MTAyMH0.rYb9tx_me30rMiL5Hq35AyYJK68uzTYcgrhxwNSq2lM', // Replace with your Supabase anon key
  tableName: 'questions' // Updated table name
};

// Extension settings
const EXTENSION_CONFIG = {
  quizInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
  maxAttempts: 3, // Maximum attempts per question
  questionsPerSession: 1, // Number of questions to answer per session
  preferredDifficulty: 'medium', // Preferred difficulty level: 'easy', 'medium', 'hard'
  preferredTags: ['Algebra', 'Geometry', 'Grammar', 'Vocabulary'] // Preferred question tags
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG, EXTENSION_CONFIG };
} 