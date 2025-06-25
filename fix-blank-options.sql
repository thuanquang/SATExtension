-- SAT Quiz Extension - Fix Blank Options Issues
-- This script identifies and helps fix questions with blank or invalid answer choices

-- 1. Find all questions with blank options issues
SELECT 
    question_id,
    question_text,
    answer_choices,
    correct_answer,
    CASE 
        WHEN answer_choices IS NULL THEN 'NULL answer_choices'
        WHEN array_length(answer_choices, 1) IS NULL THEN 'Empty answer_choices array'
        WHEN array_length(answer_choices, 1) < 2 THEN 'Less than 2 options'
        WHEN answer_choices && ARRAY['', NULL] THEN 'Contains blank/null options'
        ELSE 'Other issue'
    END as issue_type
FROM questions 
WHERE question_type = 'multiple_choice' 
AND (
    answer_choices IS NULL 
    OR array_length(answer_choices, 1) IS NULL
    OR array_length(answer_choices, 1) < 2 
    OR answer_choices && ARRAY['', NULL]
);

-- 2. Count problematic questions by issue type
SELECT 
    CASE 
        WHEN answer_choices IS NULL THEN 'NULL answer_choices'
        WHEN array_length(answer_choices, 1) IS NULL THEN 'Empty answer_choices array'
        WHEN array_length(answer_choices, 1) < 2 THEN 'Less than 2 options'
        WHEN answer_choices && ARRAY['', NULL] THEN 'Contains blank/null options'
        ELSE 'Other issue'
    END as issue_type,
    COUNT(*) as count
FROM questions 
WHERE question_type = 'multiple_choice' 
AND (
    answer_choices IS NULL 
    OR array_length(answer_choices, 1) IS NULL
    OR array_length(answer_choices, 1) < 2 
    OR answer_choices && ARRAY['', NULL]
)
GROUP BY issue_type
ORDER BY count DESC;

-- 3. Find questions with invalid correct_answer indices
SELECT 
    question_id,
    question_text,
    answer_choices,
    correct_answer,
    array_length(answer_choices, 1) as choices_count,
    correct_answer::integer as correct_index
FROM questions 
WHERE question_type = 'multiple_choice' 
AND answer_choices IS NOT NULL
AND array_length(answer_choices, 1) > 0
AND (
    correct_answer::integer < 1 
    OR correct_answer::integer > array_length(answer_choices, 1)
    OR correct_answer !~ '^[0-9]+$'
);

-- 4. Show a sample of good questions for reference
SELECT 
    question_id,
    LEFT(question_text, 50) || '...' as question_preview,
    answer_choices,
    correct_answer,
    array_length(answer_choices, 1) as choices_count
FROM questions 
WHERE question_type = 'multiple_choice' 
AND answer_choices IS NOT NULL
AND array_length(answer_choices, 1) >= 2
AND NOT (answer_choices && ARRAY['', NULL])
AND correct_answer::integer >= 1 
AND correct_answer::integer <= array_length(answer_choices, 1)
LIMIT 5;

-- 5. DELETE problematic questions that cannot be easily fixed
-- UNCOMMENT THE FOLLOWING LINES IF YOU WANT TO DELETE UNFIXABLE QUESTIONS
-- WARNING: This will permanently delete data!

-- DELETE FROM questions 
-- WHERE question_type = 'multiple_choice' 
-- AND answer_choices IS NULL;

-- DELETE FROM questions 
-- WHERE question_type = 'multiple_choice' 
-- AND array_length(answer_choices, 1) IS NULL;

-- 6. Example fixes for common issues
-- Replace these with actual question IDs and proper answer choices

-- Fix a question with blank options (example)
-- UPDATE questions 
-- SET answer_choices = ARRAY['Correct answer', 'Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3']
-- WHERE question_id = 'your-question-id-here';

-- Fix correct_answer index if needed (example)
-- UPDATE questions 
-- SET correct_answer = '1'
-- WHERE question_id = 'your-question-id-here';

-- 7. Validation query to run after fixes
-- This should return 0 rows if all issues are fixed
SELECT 
    question_id,
    'Still has issues' as status
FROM questions 
WHERE question_type = 'multiple_choice' 
AND (
    answer_choices IS NULL 
    OR array_length(answer_choices, 1) IS NULL
    OR array_length(answer_choices, 1) < 2 
    OR answer_choices && ARRAY['', NULL]
    OR correct_answer::integer < 1 
    OR correct_answer::integer > array_length(answer_choices, 1)
);

-- 8. Final statistics after cleanup
SELECT 
    COUNT(*) as total_questions,
    COUNT(CASE WHEN question_type = 'multiple_choice' THEN 1 END) as multiple_choice_questions,
    COUNT(CASE WHEN question_type = 'numeric' THEN 1 END) as numeric_questions,
    COUNT(CASE 
        WHEN question_type = 'multiple_choice' 
        AND answer_choices IS NOT NULL
        AND array_length(answer_choices, 1) >= 2
        AND NOT (answer_choices && ARRAY['', NULL])
        AND correct_answer::integer >= 1 
        AND correct_answer::integer <= array_length(answer_choices, 1)
        THEN 1 
    END) as valid_multiple_choice_questions
FROM questions; 