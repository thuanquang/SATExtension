// Simplified Supabase client for Chrome extension content scripts
// Uses global SUPABASE_CONFIG from config.js

// Global helper functions
window.ensureAuth = async function() {
  // For content script usage, we'll use a simple user ID system
  let userId = localStorage.getItem('sat_quiz_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sat_quiz_user_id', userId);
  }
  return { id: userId };
};

window.getCurrentUserId = async function() {
  let userId = localStorage.getItem('sat_quiz_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sat_quiz_user_id', userId);
  }
  return userId;
};

// Simple database operations
window.supabaseQuery = async function(table, operation, data = null, filters = null) {
  try {
    let url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
    let method = 'GET';
    let body = null;
    
    const headers = {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json'
    };
    
    if (operation === 'select') {
      if (filters) {
        const filterParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (key === 'limit') {
            filterParams.append('limit', value);
          } else if (key === 'order') {
            filterParams.append('order', value);
          } else {
            filterParams.append(key, `eq.${value}`);
          }
        });
        url += `?${filterParams.toString()}`;
      }
    } else if (operation === 'insert') {
      method = 'POST';
      body = JSON.stringify(Array.isArray(data) ? data : [data]);
    } else if (operation === 'upsert') {
      method = 'POST';
      headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
      body = JSON.stringify(Array.isArray(data) ? data : [data]);
    } else if (operation === 'update') {
      method = 'PATCH';
      body = JSON.stringify(data);
      if (filters) {
        const filterString = Object.entries(filters)
          .map(([key, value]) => `${key}=eq.${value}`)
          .join('&');
        url += `?${filterString}`;
      }
    }
    
    console.log(`🔍 Supabase Query: ${operation} on ${table}`, { url, method, body, headers });
    
    const response = await fetch(url, {
      method,
      headers,
      body
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 Supabase HTTP error! status: ${response.status}, body: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Supabase Query successful:`, result);
    return { data: result, error: null };
  } catch (error) {
    console.error('Supabase query error:', error);
    return { data: null, error: error.message };
  }
};

// Question fetching functionality
window.getRandomQuestion = async function() {
  try {
    console.log('🎓 Fetching random question...');
    
    const { data, error } = await window.supabaseQuery(SUPABASE_CONFIG.tableName, 'select');
    
    if (error || !data || data.length === 0) {
      console.error('🎓 Error fetching questions:', error);
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * data.length);
    const selectedQuestion = data[randomIndex];
    return window.formatQuestion(selectedQuestion);
  } catch (error) {
    console.error('🎓 Error fetching question:', error);
    return null;
  }
};

// Format question to match the expected structure
window.formatQuestion = function(question) {
  if (!question || !question.question_text) {
    return null;
  }
  
  if (question.question_type === 'multiple_choice') {
    const choices = question.answer_choices || [];
    const correctIndex = parseInt(question.correct_answer) - 1;
    
    return {
      id: question.question_id,
      question_id: question.question_id,
      question_text: question.question_text,
      instructions: question.instructions,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tag: question.tag,
      question_type: question.question_type,
      option_a: choices[0] || '',
      option_b: choices[1] || '',
      option_c: choices[2] || '',
      option_d: choices[3] || '',
      correct_answer: String.fromCharCode(65 + correctIndex),
      answer_choices: choices
    };
  } else if (question.question_type === 'numeric') {
    return {
      id: question.question_id,
      question_id: question.question_id,
      question_text: question.question_text,
      instructions: question.instructions,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tag: question.tag,
      question_type: question.question_type,
      correct_answer: String(question.correct_answer).trim(),
      answer_choices: []
    };
  }
  
  return question;
};

console.log('🎓 Supabase client loaded successfully');