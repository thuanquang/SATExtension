// Supabase client for Chrome extension
class SupabaseClient {
  constructor() {
    this.supabaseUrl = SUPABASE_CONFIG.url;
    this.supabaseKey = SUPABASE_CONFIG.anonKey;
    this.tableName = SUPABASE_CONFIG.tableName;
    console.log('🎓 Supabase Client: Initialized with URL:', this.supabaseUrl);
    console.log('🎓 Supabase Client: Table name:', this.tableName);
  }

  // Create Supabase client using fetch API (no external dependencies)
  async createClient() {
    return {
      from: (table) => ({
        select: (columns = '*') => this.select(table, columns),
        insert: (data) => this.insert(table, data),
        update: (data) => this.update(table, data),
        delete: () => this.delete(table)
      })
    };
  }

  async select(table, columns = '*') {
    const url = `${this.supabaseUrl}/rest/v1/${table}?select=${columns}`;
    console.log('🎓 Supabase Client: Making SELECT request to:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🎓 Supabase Client: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎓 Supabase Client: HTTP error! status:', response.status, 'response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🎓 Supabase Client: Received data:', data);
    return { data: data, error: null };
  }

  async insert(table, data) {
    const url = `${this.supabaseUrl}/rest/v1/${table}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return { data: await response.json(), error: null };
  }

  async update(table, data) {
    const url = `${this.supabaseUrl}/rest/v1/${table}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return { data: await response.json(), error: null };
  }

  async delete(table) {
    const url = `${this.supabaseUrl}/rest/v1/${table}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return { data: null, error: null };
  }

  // Get random SAT question with filtering
  async getRandomQuestion() {
    try {
      console.log('🎓 Supabase Client: Getting random question...');
      const client = await this.createClient();
      
      // Build filter conditions
      const filters = [];
      
      // Filter by preferred tags if specified
      if (EXTENSION_CONFIG.preferredTags && EXTENSION_CONFIG.preferredTags.length > 0) {
        const tagFilter = EXTENSION_CONFIG.preferredTags.map(tag => `tag.eq.${tag}`).join(',');
        filters.push(`or(${tagFilter})`);
        console.log('🎓 Supabase Client: Filtering by tags:', EXTENSION_CONFIG.preferredTags);
      }
      
      // Filter by preferred difficulty if specified
      if (EXTENSION_CONFIG.preferredDifficulty) {
        filters.push(`difficulty.eq.${EXTENSION_CONFIG.preferredDifficulty}`);
        console.log('🎓 Supabase Client: Filtering by difficulty:', EXTENSION_CONFIG.preferredDifficulty);
      }
      
      // Build the URL with filters
      let url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*`;
      if (filters.length > 0) {
        url += `&${filters.join('&')}`;
      }
      
      console.log('🎓 Supabase Client: Making request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🎓 Supabase Client: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎓 Supabase Client: HTTP error! status:', response.status, 'response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🎓 Supabase Client: Received data length:', data ? data.length : 0);
      
      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        const selectedQuestion = data[randomIndex];
        console.log('🎓 Supabase Client: Selected question index:', randomIndex);
        console.log('🎓 Supabase Client: Selected question:', selectedQuestion);
        return this.formatQuestion(selectedQuestion);
      }
      
      console.log('🎓 Supabase Client: No questions match filters, trying fallback...');
      
      // If no questions match the filters, get any random question
      const fallbackResponse = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName}?select=*`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🎓 Supabase Client: Fallback response status:', fallbackResponse.status);
      
      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error('🎓 Supabase Client: Fallback HTTP error! status:', fallbackResponse.status, 'response:', errorText);
        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      console.log('🎓 Supabase Client: Fallback data length:', fallbackData ? fallbackData.length : 0);
      
      if (fallbackData && fallbackData.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackData.length);
        const selectedQuestion = fallbackData[randomIndex];
        console.log('🎓 Supabase Client: Selected fallback question index:', randomIndex);
        console.log('🎓 Supabase Client: Selected fallback question:', selectedQuestion);
        return this.formatQuestion(selectedQuestion);
      }
      
      console.log('🎓 Supabase Client: No questions available in database');
      return null;
    } catch (error) {
      console.error('🎓 Supabase Client: Error fetching question:', error);
      return null;
    }
  }

  // Format question to match the expected structure
  formatQuestion(question) {
    console.log('🎓 Supabase Client: Formatting question:', question);
    
    if (question.question_type === 'multiple_choice') {
      // For multiple choice questions, convert to the expected format
      const choices = question.answer_choices || [];
      const correctIndex = parseInt(question.correct_answer) - 1; // Convert from 1-based to 0-based
      
      const formattedQuestion = {
        id: question.question_id,
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
        correct_answer: String.fromCharCode(65 + correctIndex), // Convert to A, B, C, D
        answer_choices: choices
      };
      
      console.log('🎓 Supabase Client: Formatted multiple choice question:', formattedQuestion);
      return formattedQuestion;
    } else if (question.question_type === 'numeric') {
      // For numeric questions
      const formattedQuestion = {
        id: question.question_id,
        question_text: question.question_text,
        instructions: question.instructions,
        explanation: question.explanation,
        difficulty: question.difficulty,
        tag: question.tag,
        question_type: question.question_type,
        correct_answer: question.correct_answer,
        answer_choices: []
      };
      
      console.log('🎓 Supabase Client: Formatted numeric question:', formattedQuestion);
      return formattedQuestion;
    }
    
    console.log('🎓 Supabase Client: Returning unformatted question:', question);
    return question;
  }

  // Get question by ID
  async getQuestionById(id) {
    try {
      const url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*&question_id=eq.${id}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return this.formatQuestion(data[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching question by ID:', error);
      return null;
    }
  }

  // Get questions by tag
  async getQuestionsByTag(tag) {
    try {
      const url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*&tag=eq.${tag}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return data.map(question => this.formatQuestion(question));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching questions by tag:', error);
      return [];
    }
  }

  // Get questions by difficulty
  async getQuestionsByDifficulty(difficulty) {
    try {
      const url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*&difficulty=eq.${difficulty}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return data.map(question => this.formatQuestion(question));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching questions by difficulty:', error);
      return [];
    }
  }
}

// Create global instance
const supabaseClient = new SupabaseClient(); 