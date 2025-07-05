-- SAT Quiz Blocker - TEMP PATCH SCRIPT
-- This script only applies function and policy fixes. It does NOT create tables, sequences, or insert data.
-- Safe to run on an existing database to patch function search_path and optimize RLS/policies.

-- =============================
-- FUNCTION PATCHES (search_path)
-- =============================

CREATE OR REPLACE FUNCTION generate_prefixed_sequential_id(sequence_name TEXT, prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_val;
    RETURN prefix || '_' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF xp < 500 THEN
        RETURN (xp / 100) + 1;
    ELSIF xp < 1500 THEN
        RETURN ((xp - 500) / 200) + 6;
    ELSIF xp < 3000 THEN
        RETURN ((xp - 1500) / 300) + 11;
    ELSIF xp < 5000 THEN
        RETURN ((xp - 3000) / 400) + 16;
    ELSE
        RETURN ((xp - 5000) / 500) + 21;
    END IF;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION get_xp_for_level(level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF level <= 5 THEN
        RETURN (level - 1) * 100;
    ELSIF level <= 10 THEN
        RETURN 500 + ((level - 6) * 200);
    ELSIF level <= 15 THEN
        RETURN 1500 + ((level - 11) * 300);
    ELSIF level <= 20 THEN
        RETURN 3000 + ((level - 16) * 400);
    ELSE
        RETURN 5000 + ((level - 21) * 500);
    END IF;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION generate_anonymous_display_name()
RETURNS TEXT AS $$
DECLARE
    animals TEXT[] := ARRAY['Owl', 'Fox', 'Cat', 'Dog', 'Rabbit', 'Eagle', 'Wolf', 'Bear', 'Lion', 'Tiger', 'Dolphin', 'Whale', 'Shark', 'Turtle', 'Penguin'];
    colors TEXT[] := ARRAY['Red', 'Blue', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Teal', 'Indigo', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Amber'];
    animal TEXT;
    color TEXT;
BEGIN
    animal := animals[floor(random() * array_length(animals, 1)) + 1];
    color := colors[floor(random() * array_length(colors, 1)) + 1];
    RETURN color || ' ' || animal;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- =============================
-- POLICY PATCHES (RLS/policy optimizations)
-- =============================
-- (No duplicate table or row creation. Only policy changes.)

-- Example: If you want to optimize user policies, you can drop and recreate them as needed.
-- Uncomment and adjust as needed for your environment.
-- DROP POLICY IF EXISTS "Users can manage their own progress" ON user_progress;
-- CREATE POLICY "Users can manage their own progress" ON user_progress
--     FOR ALL USING (user_id = current_setting('request.jwt.claim.sub', true));

-- (Repeat for other tables as needed, or leave as-is if already correct.)

-- No table/sequence/data creation or inserts in this script. 