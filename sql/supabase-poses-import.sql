-- ============================================================
-- 🧘 SCULPT YOGA POSES + VARIATIONS IMPORT (SUPABASE)
-- ------------------------------------------------------------
-- This will insert all base poses and their variations.
-- Every pose registration automatically gets a default variation
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================

-- 1️⃣  Create helper function
CREATE OR REPLACE FUNCTION insert_pose_with_variations(base_name TEXT, variations TEXT[])
RETURNS void AS $$
DECLARE
    v_pose_id UUID;
    variation TEXT;
BEGIN
    -- Insert the base pose if not exists
    INSERT INTO poses (name, created_at, updated_at)
    VALUES (base_name, NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_pose_id;

    -- If pose already existed, get its id
    IF v_pose_id IS NULL THEN
        SELECT id INTO v_pose_id FROM poses WHERE name = base_name;
    END IF;

    -- Ensure we have a pose_id
    IF v_pose_id IS NULL THEN
        RAISE EXCEPTION 'Failed to get pose_id for pose: %', base_name;
    END IF;

    -- Insert the default variation (same name as pose with "(Default)" suffix)
    INSERT INTO pose_variations (pose_id, name, is_default, created_at, updated_at)
    VALUES (v_pose_id, base_name || ' (Default)', TRUE, NOW(), NOW())
    ON CONFLICT (pose_id, name) DO UPDATE SET updated_at = NOW();

    -- Insert additional variations
    IF variations IS NOT NULL THEN
        FOREACH variation IN ARRAY variations LOOP
            INSERT INTO pose_variations (pose_id, name, is_default, created_at, updated_at)
            VALUES (v_pose_id, variation, FALSE, NOW(), NOW())
            ON CONFLICT (pose_id, name) DO UPDATE SET updated_at = NOW();
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2️⃣  INSERT ALL POSES + VARIATIONS
-- ============================================================

SELECT insert_pose_with_variations('Child''s Pose', ARRAY['Side Bend']);
SELECT insert_pose_with_variations('Table Top', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Cow / Cat', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Bird Dog', ARRAY['Pulses']);
SELECT insert_pose_with_variations('Downward Facing Dog', ARRAY['Down Dog Kick']);
SELECT insert_pose_with_variations('Plank', ARRAY['Knee Plank','Forearm Plank','Renegade Row']);
SELECT insert_pose_with_variations('Side Plank', ARRAY['Side Plank with Rotation']);
SELECT insert_pose_with_variations('Bear Hover', ARRAY['Renegade Row']);
SELECT insert_pose_with_variations('Forward Fold', ARRAY['Ragdoll']);
SELECT insert_pose_with_variations('Upward Salute', ARRAY['Cactus Backbend']);
SELECT insert_pose_with_variations('Chaturanga', ARRAY['Knees Down Chaturanga']);
SELECT insert_pose_with_variations('Up Dog', ARRAY['Cobra','Sphinx']);
SELECT insert_pose_with_variations('Mountain Climbers', ARRAY['Cross Body Mountain Climbers']);
SELECT insert_pose_with_variations('Push Up', ARRAY['Modified Push Up','Tricep Push Up','Wide Arm Push Up']);
SELECT insert_pose_with_variations('Shoulder Taps', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Squat', ARRAY['Squat Pulses','Squat with Heel Raise','Squat Jumps','Squat to Alternating High Knee']);
SELECT insert_pose_with_variations('Chair', ARRAY['Chair with Overhead Press','Chair with Narrow Overhead Press','Modified Chair - Hands to Heart Center','Chair with Front Raise']);
SELECT insert_pose_with_variations('Crescent Lunge', ARRAY['Crescent Lunge with Cactus Backbend','Crescent Lunge with Overhead Press','Crescent Lunge with Pulses']);
SELECT insert_pose_with_variations('Warrior 2', ARRAY['Bicep Curls','Lateral Raise 90 Degrees','Upright Row']);
SELECT insert_pose_with_variations('Star', ARRAY['Weights to Chest','Overhead Wide Press']);
SELECT insert_pose_with_variations('Goddess', ARRAY['Oblique Lean','Torso Twists','Cross Body Punches','Cross Body Punches with Opposite Heel Raises','Goddess with Pulses','Goddess with Heel Lifts','Isometric Hold','Goddess Squat with Press','Goddess Jumps']);
SELECT insert_pose_with_variations('Reverse Warrior', ARRAY['Single Arm Weighted Press']);
SELECT insert_pose_with_variations('High Knees', ARRAY['High Knees with Twists']);
SELECT insert_pose_with_variations('Jumping Jacks', ARRAY['Squat / Smurf Jacks','Star Jacks']);
SELECT insert_pose_with_variations('Burpee', ARRAY['Half Burpee','Full Burpee']);
SELECT insert_pose_with_variations('Split Squat', ARRAY['Pulses','Isometric Hold','Bicep Curls','Hammer Curls','Weights Overhead']);
SELECT insert_pose_with_variations('Butt Kickers', ARRAY['Twisting Butt Kickers']);
SELECT insert_pose_with_variations('Speed Skaters', ARRAY['Speed Skaters with Floor Taps']);
SELECT insert_pose_with_variations('Romanian Dead Lifts', ARRAY['Single Leg']);
SELECT insert_pose_with_variations('One Leg Mountain Pose', ARRAY['Overhead Press','Knee Drive']);
SELECT insert_pose_with_variations('Half Kneeling Chop', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Kneeling Tricep Extensions', ARRAY['Pulses']);
SELECT insert_pose_with_variations('Modified Boat', ARRAY['Chest Press','Twists','Pulses']);
SELECT insert_pose_with_variations('Low Boat', ARRAY['Leg Kicks','Leg Kicks Add Chest Presses','Bicycles with Weight Pass']);
SELECT insert_pose_with_variations('Bridge', ARRAY['Bridge Lifts','Single Leg Hip Lifts','Single Leg Bridge','Bridge Pulses']);
SELECT insert_pose_with_variations('Windshield Wipers', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Supine Figure Four', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Supine Twist', ARRAY[]::text[]);
SELECT insert_pose_with_variations('Supine Forward Fold', ARRAY['Hold Thighs - Ankle Roll Out']);
SELECT insert_pose_with_variations('Happy Baby', ARRAY['Hold Behind Thighs','Straighten One Leg At A Time','Rock Side to Side']);
SELECT insert_pose_with_variations('Final Rest', ARRAY[]::text[]);

-- ============================================================
-- ✅ 3️⃣  VIEW RESULTS
-- ============================================================

-- View all poses and their variations
-- (Default variations will end with "(Default)")
SELECT 
  p.name AS pose_name,
  v.name AS variation_name,
  v.is_default
FROM pose_variations v
JOIN poses p ON v.pose_id = p.id
ORDER BY p.name, v.is_default DESC, v.name;

-- ============================================================
-- 🧹 CLEANUP (Optional - run if you want to remove the function)
-- ============================================================

-- DROP FUNCTION IF EXISTS insert_pose_with_variations(TEXT, TEXT[]);

