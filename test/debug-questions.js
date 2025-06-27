// Debug script for identifying blank quiz options
// Run this in the browser console to diagnose issues

class QuestionDebugger {
  constructor() {
    this.supabaseUrl = SUPABASE_CONFIG.url;
    this.supabaseKey = SUPABASE_CONFIG.anonKey;
    this.tableName = SUPABASE_CONFIG.tableName;
  }

  async testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
      const url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*&limit=5`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Database connection failed:', errorText);
        return false;
      }
      
      const data = await response.json();
      console.log('🔍 Database connection successful');
      console.log('🔍 Sample data:', data);
      return true;
    } catch (error) {
      console.error('🔍 Database connection error:', error);
      return false;
    }
  }

  async analyzeQuestionData() {
    console.log('🔍 Analyzing question data...');
    
    try {
      const url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*`;
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
      
      const questions = await response.json();
      console.log('🔍 Total questions in database:', questions.length);
      
      // Analyze multiple choice questions
      const multipleChoiceQuestions = questions.filter(q => q.question_type === 'multiple_choice');
      console.log('🔍 Multiple choice questions:', multipleChoiceQuestions.length);
      
      // Check for issues with answer_choices
      const issues = [];
      
      multipleChoiceQuestions.forEach((question, index) => {
        const problems = [];
        
        // Check if answer_choices exists
        if (!question.answer_choices) {
          problems.push('Missing answer_choices array');
        } else if (!Array.isArray(question.answer_choices)) {
          problems.push('answer_choices is not an array');
        } else if (question.answer_choices.length === 0) {
          problems.push('answer_choices array is empty');
        } else {
          // Check for empty or null values in answer_choices
          question.answer_choices.forEach((choice, choiceIndex) => {
            if (!choice || choice.trim() === '') {
              problems.push(`Empty choice at index ${choiceIndex}`);
            }
          });
        }
        
        // Check correct_answer
        if (!question.correct_answer) {
          problems.push('Missing correct_answer');
        }
        
        if (problems.length > 0) {
          issues.push({
            questionId: question.question_id,
            questionText: question.question_text,
            problems: problems,
            answerChoices: question.answer_choices,
            correctAnswer: question.correct_answer
          });
        }
      });
      
      console.log('🔍 Issues found:', issues.length);
      if (issues.length > 0) {
        console.log('🔍 Problematic questions:', issues);
      }
      
      return {
        totalQuestions: questions.length,
        multipleChoiceQuestions: multipleChoiceQuestions.length,
        issues: issues
      };
    } catch (error) {
      console.error('🔍 Error analyzing question data:', error);
      return null;
    }
  }

  async testQuestionFormatting() {
    console.log('🔍 Testing question formatting...');
    
    try {
      const url = `${this.supabaseUrl}/rest/v1/${this.tableName}?select=*&question_type=eq.multiple_choice&limit=3`;
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
      
      const questions = await response.json();
      
      questions.forEach((question, index) => {
        console.log(`🔍 Testing question ${index + 1}:`, question.question_id);
        console.log('🔍 Raw question data:', question);
        
        // Test the formatQuestion logic
        const formatted = this.formatQuestion(question);
        console.log('🔍 Formatted question:', formatted);
        
        // Test the modal HTML generation
        const modalHTML = this.generateModalHTML(formatted);
        console.log('🔍 Modal HTML length:', modalHTML.length);
        
        // Check for empty options in the HTML
        const optionMatches = modalHTML.match(/<span style="font-weight: 500;">[A-D]\.<\/span> ([^<]+)/g);
        if (optionMatches) {
          optionMatches.forEach((match, matchIndex) => {
            const optionText = match.replace(/<span style="font-weight: 500;">[A-D]\.<\/span> /, '');
            if (!optionText || optionText.trim() === '') {
              console.error(`🔍 Empty option found at index ${matchIndex}:`, match);
            }
          });
        }
      });
    } catch (error) {
      console.error('🔍 Error testing question formatting:', error);
    }
  }

  formatQuestion(question) {
    console.log('🔍 Formatting question:', question);
    
    if (question.question_type === 'multiple_choice') {
      const choices = question.answer_choices || [];
      const correctIndex = parseInt(question.correct_answer) - 1;
      
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
        correct_answer: String.fromCharCode(65 + correctIndex),
        answer_choices: choices
      };
      
      return formattedQuestion;
    }
    
    return question;
  }

  generateModalHTML(question) {
    let questionContent = '';
    
    if (question.question_type === 'multiple_choice') {
      const options = question.answer_choices || [question.option_a, question.option_b, question.option_c, question.option_d];
      
      questionContent = `
        <div class="quiz-options">
          ${options.map((option, index) => `
            <label class="option-label" style="display: block; margin: 10px 0; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="answer" value="${String.fromCharCode(65 + index)}" style="margin-right: 10px;">
              <span style="font-weight: 500;">${String.fromCharCode(65 + index)}.</span> ${option}
            </label>
          `).join('')}
        </div>
      `;
    }
    
    return `
      <div class="quiz-header">
        <h2>🎓 SAT Quiz Required</h2>
        <p>Answer this question correctly to continue browsing</p>
      </div>
      <div class="quiz-question">
        <h3>${question.question_text}</h3>
        ${questionContent}
      </div>
    `;
  }

  async runFullDiagnostic() {
    console.log('🔍 Starting full diagnostic...');
    
    // Test 1: Database connection
    const connectionOk = await this.testDatabaseConnection();
    if (!connectionOk) {
      console.error('🔍 Diagnostic failed: Database connection failed');
      return;
    }
    
    // Test 2: Analyze question data
    const analysis = await this.analyzeQuestionData();
    if (!analysis) {
      console.error('🔍 Diagnostic failed: Could not analyze question data');
      return;
    }
    
    // Test 3: Test question formatting
    await this.testQuestionFormatting();
    
    console.log('🔍 Diagnostic complete!');
    console.log('🔍 Summary:', analysis);
  }
}

// Create and run the debugger
const questionDebugger = new QuestionDebugger();
questionDebugger.runFullDiagnostic(); 