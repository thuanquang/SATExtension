-- Fix RLS Policies for SAT Quiz Extension
-- Update policies to work with simple user ID system instead of JWT

-- Drop existing user data policies
DROP POLICY IF EXISTS "Users can manage their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can manage their own subject progress" ON subject_progress;
DROP POLICY IF EXISTS "Users can manage their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can manage their own challenge progress" ON user_challenge_progress;
DROP POLICY IF EXISTS "Users can manage their own customizations" ON user_customizations;
DROP POLICY IF EXISTS "Users can manage their own quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Users can manage their own streaks" ON streak_history;
DROP POLICY IF EXISTS "Users can manage their own analytics" ON performance_analytics;

-- Create simplified policies that allow all operations (for extension use)
-- In a production environment, you would implement proper authentication

CREATE POLICY "Allow all operations on user_progress" ON user_progress
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on subject_progress" ON subject_progress
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on user_badges" ON user_badges
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on user_challenge_progress" ON user_challenge_progress
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on user_customizations" ON user_customizations
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on quiz_sessions" ON quiz_sessions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on streak_history" ON streak_history
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on performance_analytics" ON performance_analytics
    FOR ALL USING (true);

-- Verify policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_progress', 'user_badges', 'subject_progress', 'user_challenge_progress')
ORDER BY tablename, policyname; 