/**
 * A stable, app-owned exercise vocabulary.
 *
 * Exercise IDs and classification values are deliberately machine-friendly.
 * Display names, aliases, and coaching copy may evolve without changing an ID.
 * Every value in equipmentIds is required; an empty array means bodyweight or
 * no gym equipment is required.
 */

export const EXERCISE_DIFFICULTIES = Object.freeze([
  "beginner",
  "intermediate",
  "advanced",
]);

export const MOVEMENT_PATTERNS = Object.freeze([
  "conditioning",
  "core_anti_extension",
  "core_flexion",
  "elbow_extension",
  "elbow_flexion",
  "hip_abduction",
  "hip_adduction",
  "hip_hinge",
  "horizontal_pull",
  "horizontal_push",
  "knee_extension",
  "knee_flexion",
  "lunge",
  "mobility",
  "plantar_flexion",
  "shoulder_abduction",
  "shoulder_horizontal_abduction",
  "shoulder_horizontal_adduction",
  "squat",
  "vertical_pull",
  "vertical_push",
]);

const DEFINITIONS = [
  [
    "push_up", "Push-Up", ["Push Up", "Pushups", "Press-Up"], "horizontal_push", "chest",
    ["triceps", "shoulders", "core"], "beginner", [],
    ["Start in a rigid high plank with hands just outside the shoulders.", "Lower the chest between the hands, then press the floor away."],
    ["Brace from ribs to glutes.", "Keep elbows about 30-45 degrees from the torso."],
    ["Letting the hips sag.", "Flaring the elbows straight out."],
  ],
  [
    "pike_push_up", "Pike Push-Up", ["Pike Press", "Bodyweight Shoulder Press"], "vertical_push", "shoulders",
    ["triceps", "upper_chest", "core"], "intermediate", [],
    ["Set the hips high in an inverted V and place hands shoulder-width apart.", "Lower the crown toward the floor between the hands, then press up."],
    ["Drive the floor away.", "Keep the hips high."],
    ["Turning the rep into a regular push-up.", "Dropping the head straight down onto the floor."],
  ],
  [
    "bodyweight_squat", "Bodyweight Squat", ["Air Squat", "Unweighted Squat", "Squats"], "squat", "quadriceps",
    ["glutes", "hamstrings", "core"], "beginner", [],
    ["Stand about shoulder-width and brace before descending.", "Sit between the hips, keep the whole foot planted, and stand tall."],
    ["Track knees over toes.", "Push through the mid-foot."],
    ["Heels lifting.", "Knees collapsing inward."],
  ],
  [
    "bodyweight_walking_lunge", "Bodyweight Walking Lunge", ["Walking Lunge", "Walking Lunges"], "lunge", "quadriceps",
    ["glutes", "hamstrings", "calves"], "beginner", [],
    ["Step forward far enough for both knees to bend comfortably.", "Lower under control, drive through the front foot, and step into the next rep."],
    ["Stay tall.", "Keep the front heel down."],
    ["Taking a very narrow step.", "Pushing mainly from the back foot."],
  ],
  [
    "reverse_lunge", "Reverse Lunge", ["Bodyweight Reverse Lunge", "Backward Lunge"], "lunge", "quadriceps",
    ["glutes", "hamstrings"], "beginner", [],
    ["Step one foot back and lower the rear knee toward the floor.", "Drive through the front foot to return, then switch sides."],
    ["Keep most pressure on the front foot.", "Use a quiet, controlled step."],
    ["Front knee collapsing inward.", "Leaning excessively backward."],
  ],
  [
    "glute_bridge", "Glute Bridge", ["Floor Glute Bridge", "Hip Bridge"], "hip_hinge", "glutes",
    ["hamstrings", "core"], "beginner", [],
    ["Lie with knees bent and feet flat near the hips.", "Brace, squeeze the glutes, and lift until shoulders, hips, and knees align."],
    ["Finish with the glutes.", "Keep the ribs down."],
    ["Overarching the low back.", "Pushing through the toes."],
  ],
  [
    "single_leg_hip_hinge", "Bodyweight Single-Leg Hip Hinge", ["Single Leg RDL", "Bodyweight Single-Leg Deadlift"], "hip_hinge", "hamstrings",
    ["glutes", "core"], "intermediate", [],
    ["Balance on one softly bent leg and send the free leg behind you.", "Hinge until the torso is nearly parallel, then squeeze the standing glute to rise."],
    ["Keep hips square.", "Reach long through the back heel."],
    ["Opening the pelvis.", "Rounding the lower back."],
  ],
  [
    "bodyweight_triceps_extension", "Bodyweight Triceps Extension", ["Bodyweight Skull Crusher", "Plank Triceps Extension"], "elbow_extension", "triceps",
    ["shoulders", "core"], "intermediate", [],
    ["From a high plank, place hands slightly forward and keep the body rigid.", "Bend only the elbows toward the floor, then extend them to press back."],
    ["Keep upper arms still.", "Scale by elevating the hands."],
    ["Hinging at the hips.", "Letting elbows flare wide."],
  ],
  [
    "prone_reverse_fly", "Prone Reverse Fly", ["Floor Reverse Fly", "Prone T Raise"], "shoulder_horizontal_abduction", "rear_deltoids",
    ["upper_back", "rotator_cuff"], "beginner", [],
    ["Lie face down with arms out in a T and thumbs up.", "Lift the arms by drawing the shoulder blades together, then lower slowly."],
    ["Reach long before lifting.", "Keep the neck neutral."],
    ["Shrugging toward the ears.", "Using low-back momentum."],
  ],
  [
    "dead_bug", "Dead Bug", ["Deadbug", "Alternating Dead Bug"], "core_anti_extension", "abdominals",
    ["hip_flexors"], "beginner", [],
    ["Lie on the back with hips and knees at 90 degrees and arms raised.", "Press the low back down while extending opposite arm and leg, then alternate."],
    ["Exhale through each reach.", "Move only as far as the back stays flat."],
    ["Arching the low back.", "Rushing the limbs."],
  ],
  [
    "forearm_plank", "Forearm Plank", ["Plank", "Elbow Plank"], "core_anti_extension", "abdominals",
    ["glutes", "shoulders"], "beginner", [],
    ["Place elbows below shoulders and extend the legs.", "Squeeze glutes and brace while holding a straight line from head to heels."],
    ["Pull elbows toward toes without moving.", "Breathe behind the brace."],
    ["Hips sagging or piking.", "Holding the breath."],
  ],
  [
    "standing_calf_raise", "Bodyweight Standing Calf Raise", ["Standing Calf Raise", "Calf Raises"], "plantar_flexion", "calves",
    [], "beginner", [],
    ["Stand tall with the whole forefoot supported.", "Rise as high as possible, pause, and lower the heels under control."],
    ["Press through the big toe.", "Use a full range."],
    ["Bouncing at the bottom.", "Rolling onto the outer foot."],
  ],
  [
    "lying_leg_raise", "Lying Leg Raise", ["Floor Leg Raise", "Leg Raises"], "core_flexion", "abdominals",
    ["hip_flexors"], "intermediate", [],
    ["Lie flat and brace the low back against the floor.", "Raise the legs, then lower only as far as the back stays in contact."],
    ["Exhale as the legs rise.", "Shorten the range if needed."],
    ["Arching the low back.", "Swinging the legs."],
  ],
  [
    "full_body_mobility_flow", "Full-Body Mobility Flow", ["Mobility Flow", "Stretch Routine", "Dynamic Mobility"], "mobility", "full_body",
    [], "beginner", [],
    ["Move through controlled hip, thoracic, and shoulder ranges.", "Pause briefly at restricted positions and breathe without forcing depth."],
    ["Move slowly and pain-free.", "Match breath to movement."],
    ["Bouncing into end range.", "Treating sharp pain as a stretch."],
  ],
  [
    "interval_run", "Interval Run", ["Running Intervals", "Sprint Intervals", "Interval Running"], "conditioning", "full_body",
    ["calves", "quadriceps", "hamstrings"], "intermediate", [],
    ["Warm up at an easy pace before the first fast interval.", "Alternate purposeful fast bouts with easy walking or jogging recoveries."],
    ["Keep early rounds repeatable.", "Run tall with relaxed shoulders."],
    ["Starting at an all-out pace.", "Skipping the warm-up."],
  ],
  [
    "barbell_back_squat", "Barbell Back Squat", ["Back Squat", "Barbell Squat", "High Bar Back Squat"], "squat", "quadriceps",
    ["glutes", "hamstrings", "core"], "intermediate", ["olympic_barbell", "squat_rack"],
    ["Set the bar across the upper back, brace, and unrack with short steps.", "Squat between the hips while keeping the bar over the mid-foot, then stand."],
    ["Brace before every rep.", "Drive the floor apart."],
    ["Losing trunk tension.", "Knees collapsing inward."],
  ],
  [
    "barbell_deadlift", "Barbell Deadlift", ["Conventional Deadlift", "Deadlift"], "hip_hinge", "glutes",
    ["hamstrings", "back", "core"], "intermediate", ["olympic_barbell"],
    ["Stand with the bar over mid-foot, hinge down, and brace with arms straight.", "Push the floor away and finish tall, then hinge the bar back down."],
    ["Keep the bar close.", "Take slack out before lifting."],
    ["Jerking the bar from the floor.", "Overextending at lockout."],
  ],
  [
    "barbell_romanian_deadlift", "Barbell Romanian Deadlift", ["Romanian Deadlift", "Barbell RDL", "RDL"], "hip_hinge", "hamstrings",
    ["glutes", "back", "core"], "intermediate", ["olympic_barbell"],
    ["Hold the bar at the thighs with soft knees and a firm brace.", "Push hips back while sliding the bar down the legs, then drive hips forward."],
    ["Keep shins nearly vertical.", "Stop when the hamstrings limit the hinge."],
    ["Turning it into a squat.", "Letting the bar drift forward."],
  ],
  [
    "barbell_bench_press", "Barbell Bench Press", ["Bench Press", "Flat Barbell Bench Press", "Barbell Chest Press"], "horizontal_push", "chest",
    ["triceps", "shoulders"], "intermediate", ["olympic_barbell", "flat_bench"],
    ["Lie with feet planted and shoulder blades set, then grip just outside shoulder-width.", "Lower the bar to mid-chest and press it back over the shoulders."],
    ["Keep the upper back tight.", "Stack wrists over elbows."],
    ["Bouncing the bar.", "Lifting the hips off the bench."],
  ],
  [
    "barbell_overhead_press", "Barbell Overhead Press", ["Overhead Press", "Standing Barbell Press", "Military Press", "OHP"], "vertical_push", "shoulders",
    ["triceps", "upper_chest", "core"], "intermediate", ["olympic_barbell"],
    ["Start with the bar at the upper chest, wrists stacked, and glutes braced.", "Press overhead while moving the head back, then finish with the bar over mid-foot."],
    ["Squeeze glutes and ribs down.", "Finish with arms beside the ears."],
    ["Leaning far backward.", "Pressing around the face."],
  ],
  [
    "barbell_bent_over_row", "Barbell Bent-Over Row", ["Bent Over Row", "Barbell Row", "Bent-Over Row"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids", "core"], "intermediate", ["olympic_barbell"],
    ["Hinge with a neutral spine and let the bar hang below the shoulders.", "Pull the bar toward the lower ribs, pause, and lower without changing torso angle."],
    ["Lead with the elbows.", "Hold the hinge."],
    ["Jerking the torso upright.", "Shrugging the shoulders."],
  ],
  [
    "ez_bar_preacher_curl", "EZ-Bar Preacher Curl", ["EZ Bar Preacher Curl", "Preacher Curl with EZ Bar"], "elbow_flexion", "biceps",
    ["forearms"], "beginner", ["ez_bar", "preacher_curl_bench"],
    ["Set the upper arms fully on the pad and hold the angled grips.", "Curl without lifting the arms, squeeze, and lower short of elbow lockout."],
    ["Keep armpits anchored.", "Control the bottom."],
    ["Lifting off the pad.", "Dropping quickly into extension."],
  ],
  [
    "ez_bar_skull_crusher", "EZ-Bar Skull Crusher", ["EZ Bar Skullcrusher", "Lying EZ Bar Triceps Extension"], "elbow_extension", "triceps",
    ["forearms"], "intermediate", ["ez_bar", "flat_bench"],
    ["Lie on the bench with the bar above the shoulders and upper arms angled slightly back.", "Bend the elbows to lower behind the forehead, then extend without moving the shoulders."],
    ["Point elbows forward.", "Use a controlled stretch."],
    ["Flaring the elbows.", "Turning the rep into a press."],
  ],
  [
    "landmine_press", "Half-Kneeling Landmine Press", ["Landmine Press", "Single Arm Landmine Press"], "vertical_push", "shoulders",
    ["triceps", "upper_chest", "core"], "beginner", ["landmine", "olympic_barbell"],
    ["Hold the bar end at one shoulder from a half-kneeling stance.", "Brace and press up and forward until the arm is long, then return."],
    ["Reach through the press.", "Keep ribs stacked over hips."],
    ["Rotating the torso.", "Shrugging at the top."],
  ],
  [
    "landmine_row", "Landmine Row", ["T-Bar Landmine Row", "Bent-Over Landmine Row"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids"], "intermediate", ["landmine", "olympic_barbell"],
    ["Straddle the bar, hinge with a neutral spine, and hold the loaded end securely.", "Pull toward the lower chest, pause, and lower to full arm length."],
    ["Drive elbows behind you.", "Keep the torso fixed."],
    ["Standing up during the pull.", "Rounding the back."],
  ],
  [
    "dumbbell_bench_press", "Dumbbell Bench Press", ["Flat Dumbbell Press", "Dumbbell Chest Press"], "horizontal_push", "chest",
    ["triceps", "shoulders"], "beginner", ["dumbbells", "flat_bench"],
    ["Lie on the bench with dumbbells above the chest and feet planted.", "Lower with forearms vertical, then press the weights together and up."],
    ["Set shoulder blades down and back.", "Keep wrists over elbows."],
    ["Dropping elbows too low.", "Clashing the dumbbells at the top."],
  ],
  [
    "incline_dumbbell_bench_press", "Incline Dumbbell Bench Press", ["Incline Dumbbell Press", "Dumbbell Incline Press"], "horizontal_push", "chest",
    ["shoulders", "triceps"], "beginner", ["dumbbells", "incline_bench"],
    ["Set a low incline and begin with dumbbells over the upper chest.", "Lower beside the chest with control, then press up without shrugging."],
    ["Use a modest bench angle.", "Keep the upper back planted."],
    ["Setting the bench too upright.", "Letting shoulders roll forward."],
  ],
  [
    "decline_dumbbell_bench_press", "Decline Dumbbell Bench Press", ["Decline Dumbbell Press", "Dumbbell Decline Press"], "horizontal_push", "chest",
    ["triceps", "shoulders"], "intermediate", ["dumbbells", "decline_bench"],
    ["Secure the legs and start with dumbbells above the lower chest.", "Lower with wrists stacked over elbows, then press to straight arms."],
    ["Keep the chest tall.", "Use a spotter when loading heavy."],
    ["Sliding on the bench.", "Flaring elbows excessively."],
  ],
  [
    "dumbbell_shoulder_press", "Dumbbell Shoulder Press", ["Dumbbell Overhead Press", "DB Shoulder Press"], "vertical_push", "shoulders",
    ["triceps", "upper_chest"], "beginner", ["dumbbells"],
    ["Begin with dumbbells at shoulder height and brace the trunk.", "Press overhead until arms align with the ears, then lower smoothly."],
    ["Keep ribs down.", "Press slightly inward."],
    ["Arching the low back.", "Stopping far short of a comfortable range."],
  ],
  [
    "one_arm_dumbbell_row", "One-Arm Dumbbell Row", ["Single Arm Dumbbell Row", "Dumbbell Row"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids"], "beginner", ["dumbbells", "flat_bench"],
    ["Support one hand and knee on the bench with the other foot grounded.", "Pull the dumbbell toward the hip, pause, and lower to a long arm."],
    ["Keep shoulders square.", "Pull elbow toward the back pocket."],
    ["Twisting the torso.", "Shrugging the working shoulder."],
  ],
  [
    "dumbbell_goblet_squat", "Dumbbell Goblet Squat", ["Goblet Squat", "DB Goblet Squat"], "squat", "quadriceps",
    ["glutes", "hamstrings", "core"], "beginner", ["dumbbells"],
    ["Hold one dumbbell at the chest and set the feet comfortably apart.", "Squat between the knees with the torso braced, then drive up."],
    ["Keep the load close.", "Use elbows as a counterbalance."],
    ["Holding the weight away from the body.", "Heels lifting."],
  ],
  [
    "dumbbell_walking_lunge", "Dumbbell Walking Lunge", ["Dumbbell Walking Lunges", "DB Walking Lunge"], "lunge", "quadriceps",
    ["glutes", "hamstrings", "calves"], "intermediate", ["dumbbells"],
    ["Hold dumbbells at the sides and take a controlled forward step.", "Lower both knees, drive through the front foot, and continue walking."],
    ["Keep the weights quiet.", "Stay tall over the hips."],
    ["Using steps that are too short.", "Letting the front knee cave."],
  ],
  [
    "dumbbell_romanian_deadlift", "Dumbbell Romanian Deadlift", ["Dumbbell RDL", "DB Romanian Deadlift"], "hip_hinge", "hamstrings",
    ["glutes", "back", "core"], "beginner", ["dumbbells"],
    ["Hold dumbbells at the thighs with knees softly bent.", "Send hips back as weights track the legs, then squeeze the glutes to stand."],
    ["Reach hips toward the wall.", "Keep weights close."],
    ["Squatting the weight.", "Rounding to gain depth."],
  ],
  [
    "dumbbell_lateral_raise", "Dumbbell Lateral Raise", ["Dumbbell Side Raise", "DB Lateral Raise"], "shoulder_abduction", "lateral_deltoids",
    ["upper_trapezius"], "beginner", ["dumbbells"],
    ["Hold light dumbbells by the sides with elbows softly bent.", "Raise to about shoulder height in the scapular plane, then lower slowly."],
    ["Lead with the elbows.", "Use controlled weight."],
    ["Swinging the torso.", "Shrugging the shoulders."],
  ],
  [
    "dumbbell_biceps_curl", "Dumbbell Biceps Curl", ["Dumbbell Curl", "Dumbbell Curls", "DB Curl"], "elbow_flexion", "biceps",
    ["forearms"], "beginner", ["dumbbells"],
    ["Stand tall with arms long and palms forward.", "Curl without moving the upper arms, squeeze, and lower completely."],
    ["Pin elbows near the ribs.", "Control the eccentric."],
    ["Swinging the hips.", "Letting elbows drift forward."],
  ],
  [
    "dumbbell_hammer_curl", "Dumbbell Hammer Curl", ["Hammer Curl", "Hammer Curls"], "elbow_flexion", "biceps",
    ["brachialis", "forearms"], "beginner", ["dumbbells"],
    ["Hold dumbbells with palms facing each other and arms long.", "Curl while keeping the neutral grip, then lower under control."],
    ["Keep wrists straight.", "Keep elbows still."],
    ["Rocking the torso.", "Shortening the bottom range."],
  ],
  [
    "dumbbell_overhead_triceps_extension", "Dumbbell Overhead Triceps Extension", ["Overhead Dumbbell Triceps Extension", "DB Overhead Extension"], "elbow_extension", "triceps",
    ["shoulders"], "beginner", ["dumbbells"],
    ["Hold one dumbbell overhead and point elbows forward.", "Lower behind the head by bending the elbows, then extend fully."],
    ["Keep ribs down.", "Let elbows stay narrow."],
    ["Arching the low back.", "Flaring the elbows."],
  ],
  [
    "bench_dip", "Bench Dip", ["Triceps Dip", "Triceps Dips", "Bench Triceps Dip"], "elbow_extension", "triceps",
    ["chest", "shoulders"], "intermediate", ["flat_bench"],
    ["Place hands on the bench edge and keep hips close to it.", "Bend elbows to a comfortable depth, then press the bench away."],
    ["Keep shoulders down.", "Use a pain-free range."],
    ["Drifting too far from the bench.", "Dropping below shoulder comfort."],
  ],
  [
    "smith_machine_squat", "Smith Machine Squat", ["Smith Squat", "Smith Back Squat"], "squat", "quadriceps",
    ["glutes", "hamstrings"], "beginner", ["smith_machine"],
    ["Set the bar across the upper back and place feet where the bar path stays balanced.", "Unlock, squat under control, and drive up before re-hooking."],
    ["Test foot position with an empty bar.", "Keep knees tracking over toes."],
    ["Relying on the hooks mid-rep.", "Placing feet too far forward or back."],
  ],
  [
    "smith_machine_bench_press", "Smith Machine Bench Press", ["Smith Bench Press", "Smith Chest Press"], "horizontal_push", "chest",
    ["triceps", "shoulders"], "beginner", ["smith_machine", "flat_bench"],
    ["Center the bench so the bar meets the mid-chest and set the safeties.", "Unhook, lower with control, press up, and rotate the bar into the hooks."],
    ["Confirm the bar path before loading.", "Keep shoulder blades set."],
    ["Misaligning the bench.", "Relaxing at the bottom."],
  ],
  [
    "pull_up", "Pull-Up", ["Pull Up", "Pullups", "Overhand Pull-Up", "Wide Grip Pull-Up"], "vertical_pull", "back",
    ["biceps", "forearms", "core"], "intermediate", ["pull_up_bar"],
    ["Hang from the bar with an overhand grip and a braced trunk.", "Pull the upper chest toward the bar, then lower to straight arms under control."],
    ["Drive elbows toward the ribs.", "Start from active shoulders."],
    ["Kipping unintentionally.", "Craning the chin over the bar."],
  ],
  [
    "chin_up", "Chin-Up", ["Chin Up", "Chinups", "Underhand Pull-Up"], "vertical_pull", "back",
    ["biceps", "forearms", "core"], "intermediate", ["pull_up_bar"],
    ["Hang with an underhand grip and brace the body.", "Pull by driving elbows down, then return slowly to full arm length."],
    ["Keep the chest tall.", "Avoid swinging."],
    ["Overusing momentum.", "Stopping short at the bottom."],
  ],
  [
    "hanging_knee_raise", "Hanging Knee Raise", ["Hanging Leg Raise", "Hanging Knee Raises"], "core_flexion", "abdominals",
    ["hip_flexors", "forearms"], "intermediate", ["pull_up_bar"],
    ["Hang tall with shoulders active and legs still.", "Curl the pelvis and bring knees toward the chest, then lower without swinging."],
    ["Lead with a pelvic tuck.", "Pause between reps."],
    ["Swinging for momentum.", "Only flexing at the hips."],
  ],
  [
    "hack_squat", "Hack Squat", ["Hack Squat Machine", "Machine Hack Squat"], "squat", "quadriceps",
    ["glutes", "hamstrings"], "beginner", ["hack_squat_machine"],
    ["Set shoulders and back against the pads with feet on the platform.", "Release the stops, descend while heels stay planted, and press to near-straight legs."],
    ["Use a stance that lets knees track freely.", "Control the sled."],
    ["Locking knees hard.", "Allowing hips to lift from the pad."],
  ],
  [
    "machine_leg_press", "Machine Leg Press", ["Leg Press", "Leg Press Machine"], "squat", "quadriceps",
    ["glutes", "hamstrings"], "beginner", ["leg_press_machine"],
    ["Set feet about shoulder-width and keep hips against the pad.", "Lower the sled to a controlled depth, then press through the whole foot."],
    ["Keep knees aligned with toes.", "Stop before the pelvis rolls."],
    ["Locking the knees.", "Using a depth that rounds the low back."],
  ],
  [
    "machine_chest_supported_row", "Machine Chest-Supported Row", ["Chest Supported Row Machine", "Plate Loaded Chest Supported Row"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids"], "beginner", ["chest_supported_row_machine"],
    ["Adjust the pad so the handles are reachable with the chest supported.", "Pull elbows back, pause near the ribs, and return to long arms."],
    ["Keep the sternum on the pad.", "Reach at the front without rounding."],
    ["Lifting the chest off the pad.", "Shrugging during the pull."],
  ],
  [
    "machine_lat_pulldown", "Machine Lat Pulldown", ["Lat Pulldown", "Lat Pulldown Machine", "Wide Grip Lat Pulldown"], "vertical_pull", "back",
    ["biceps", "rear_deltoids"], "beginner", ["lat_pulldown_machine"],
    ["Secure the thighs and begin with arms long and chest tall.", "Drive elbows down to bring the handles toward the upper chest, then return slowly."],
    ["Pull elbows into back pockets.", "Keep only a slight lean."],
    ["Pulling behind the neck.", "Using body swing."],
  ],
  [
    "machine_seated_leg_curl", "Machine Seated Leg Curl", ["Seated Leg Curl", "Seated Hamstring Curl"], "knee_flexion", "hamstrings",
    ["calves"], "beginner", ["seated_leg_curl_machine"],
    ["Align knees with the machine pivot and secure the thigh pad.", "Curl the pad down, squeeze, and return without letting the stack slam."],
    ["Keep hips pinned.", "Control the last few inches."],
    ["Lifting the hips.", "Dropping the weight stack."],
  ],
  [
    "machine_calf_extension", "Machine Calf Extension", ["Calf Extension Machine", "Machine Calf Raise"], "plantar_flexion", "calves",
    [], "beginner", ["calf_extension_machine"],
    ["Place the balls of the feet securely on the platform.", "Press through the toes to full ankle extension, pause, and lower into a stretch."],
    ["Move through the ankles.", "Keep pressure through the big toes."],
    ["Bending and straightening the knees.", "Bouncing through the bottom."],
  ],
  [
    "machine_incline_chest_press", "Machine Incline Chest Press", ["Incline Chest Press Machine", "Machine Incline Press"], "horizontal_push", "chest",
    ["shoulders", "triceps"], "beginner", ["incline_chest_press_machine"],
    ["Adjust the seat so handles begin near the upper chest.", "Press forward to long arms and return until the chest is comfortably stretched."],
    ["Keep shoulder blades against the pad.", "Use even pressure in both hands."],
    ["Setting the seat too low.", "Letting shoulders roll forward."],
  ],
  [
    "machine_hip_abduction", "Machine Hip Abduction", ["Abductor Machine", "Seated Hip Abduction"], "hip_abduction", "glutes",
    ["hip_abductors"], "beginner", ["abductor_machine"],
    ["Sit firmly against the pad with knees inside the thigh pads.", "Press the knees apart, pause, and return slowly."],
    ["Keep the pelvis still.", "Control both directions."],
    ["Bouncing out of the bottom.", "Using torso momentum."],
  ],
  [
    "machine_hip_adduction", "Machine Hip Adduction", ["Adductor Machine", "Seated Hip Adduction"], "hip_adduction", "adductors",
    [], "beginner", ["adductor_machine"],
    ["Sit firmly with knees outside the pads and choose a comfortable start width.", "Draw the legs together, pause, and return slowly."],
    ["Keep hips level.", "Use a pain-free range."],
    ["Forcing excessive width.", "Letting the stack slam."],
  ],
  [
    "machine_pec_fly", "Machine Pec Fly", ["Fly Machine", "Pec Deck", "Machine Chest Fly"], "shoulder_horizontal_adduction", "chest",
    ["shoulders"], "beginner", ["fly_machine"],
    ["Adjust the seat so upper arms align with the chest.", "Bring the pads or handles together in an arc, squeeze, and open under control."],
    ["Hug around a barrel.", "Keep the chest on the pad."],
    ["Overstretching behind the torso.", "Bending and straightening the elbows."],
  ],
  [
    "machine_leg_extension", "Machine Leg Extension", ["Leg Extension", "Leg Extension Machine"], "knee_extension", "quadriceps",
    [], "beginner", ["leg_extension_machine"],
    ["Align the knee with the pivot and place the shin behind the roller.", "Extend the knees, squeeze the quads, and lower without dropping the stack."],
    ["Keep hips and back on the pad.", "Use a smooth tempo."],
    ["Kicking the weight up.", "Lifting the hips."],
  ],
  [
    "machine_preacher_curl", "Machine Preacher Curl", ["Preacher Curl Machine", "Machine Biceps Curl"], "elbow_flexion", "biceps",
    ["forearms"], "beginner", ["preacher_curl_machine"],
    ["Adjust the seat so upper arms lie flat on the pad.", "Curl the handles toward the shoulders, squeeze, and lower under control."],
    ["Keep the armpits anchored.", "Stop short of forceful lockout."],
    ["Lifting off the pad.", "Letting the stack fall."],
  ],
  [
    "machine_lateral_raise", "Machine Lateral Raise", ["Lateral Raise Machine", "Machine Side Raise"], "shoulder_abduction", "lateral_deltoids",
    ["upper_trapezius"], "beginner", ["lateral_raise_machine"],
    ["Set the seat so the machine pivot aligns with the shoulders.", "Raise the pads to shoulder height, pause, and lower slowly."],
    ["Lead with the elbows.", "Keep shoulders away from ears."],
    ["Shrugging the weight.", "Using momentum off the stack."],
  ],
  [
    "machine_seated_row", "Machine Seated Row", ["Row Machine", "Seated Row Machine"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids"], "beginner", ["row_machine"],
    ["Set the seat and chest support so the arms begin long.", "Pull handles toward the ribs, pause, and return without losing posture."],
    ["Drive elbows back.", "Keep the neck long."],
    ["Rocking the torso.", "Pulling only with the hands."],
  ],
  [
    "machine_sissy_squat", "Machine Sissy Squat", ["Sissy Squat Machine", "Supported Sissy Squat"], "squat", "quadriceps",
    ["core"], "intermediate", ["sissy_squat_machine"],
    ["Secure the lower legs and stand tall on the platform.", "Bend the knees while keeping a long line through the torso, then extend to rise."],
    ["Use a controlled knee-forward path.", "Start with a shallow range."],
    ["Dropping quickly into depth.", "Hinging heavily at the hips."],
  ],
  [
    "cable_chest_fly", "Cable Chest Fly", ["Cable Fly", "Cable Crossover", "Crossover Cable Fly"], "shoulder_horizontal_adduction", "chest",
    ["shoulders", "core"], "beginner", ["crossover_cable"],
    ["Stand between the pulleys with a split stance and softly bent elbows.", "Sweep the hands together in front of the chest, then reopen under control."],
    ["Hug around a barrel.", "Keep the torso still."],
    ["Turning it into a press.", "Allowing the stacks to pull shoulders back."],
  ],
  [
    "cable_face_pull", "Cable Face Pull", ["Face Pull", "Face Pulls", "Rope Face Pull"], "shoulder_horizontal_abduction", "rear_deltoids",
    ["upper_back", "rotator_cuff"], "beginner", ["hi_lo_pull_cable"],
    ["Set the cable near face height and take a stable stance.", "Pull toward the forehead while separating the hands, then return slowly."],
    ["Finish with hands beside the ears.", "Keep ribs stacked."],
    ["Pulling toward the chest.", "Shrugging the shoulders."],
  ],
  [
    "cable_triceps_pushdown", "Cable Triceps Pushdown", ["Triceps Pushdown", "Cable Pushdown", "Tricep Pressdown"], "elbow_extension", "triceps",
    ["forearms"], "beginner", ["hi_lo_pull_cable"],
    ["Set the cable high and pin elbows near the ribs.", "Extend the elbows until arms are straight, pause, and return without moving upper arms."],
    ["Keep wrists neutral.", "Separate the rope at the bottom if used."],
    ["Leaning bodyweight onto the handle.", "Letting elbows travel forward."],
  ],
  [
    "cable_biceps_curl", "Cable Biceps Curl", ["Cable Curl", "Standing Cable Curl"], "elbow_flexion", "biceps",
    ["forearms"], "beginner", ["hi_lo_pull_cable"],
    ["Set the pulley low and stand tall with arms extended.", "Curl the handle without moving upper arms, squeeze, and lower slowly."],
    ["Keep elbows beside the ribs.", "Stay stacked over the hips."],
    ["Leaning backward.", "Using shoulder movement."],
  ],
  [
    "cable_lateral_raise", "Single-Arm Cable Lateral Raise", ["Cable Lateral Raise", "Cable Side Raise"], "shoulder_abduction", "lateral_deltoids",
    ["upper_trapezius"], "intermediate", ["hi_lo_pull_cable"],
    ["Set the cable low and stand side-on with the handle in the outside hand.", "Raise the arm to shoulder height, pause, and lower across the body."],
    ["Lead with the elbow.", "Keep the torso quiet."],
    ["Leaning away for momentum.", "Shrugging at the top."],
  ],
  [
    "cable_lat_pulldown", "Cable Lat Pulldown", ["Lat Pulldown Cable", "Cable Pulldown"], "vertical_pull", "back",
    ["biceps", "rear_deltoids"], "beginner", ["lat_pulldown_cable"],
    ["Secure the thighs and begin with a tall torso and arms long.", "Pull the bar toward the upper chest by driving elbows down, then return slowly."],
    ["Keep the chest lifted.", "Use only a small torso lean."],
    ["Pulling behind the neck.", "Swinging to move the stack."],
  ],
  [
    "cable_seated_row", "Cable Seated Row", ["Seated Cable Row", "Cable Row", "Cable Rows"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids"], "beginner", ["row_cable"],
    ["Sit tall with knees softly bent and arms extended toward the pulley.", "Pull toward the lower ribs, pause, and reach forward without rounding."],
    ["Keep the torso nearly still.", "Lead with elbows."],
    ["Rocking backward.", "Shrugging during the pull."],
  ],
  [
    "ab_wheel_rollout", "Ab Wheel Rollout", ["Ab Rollout", "Ab Wheel", "Kneeling Ab Wheel Rollout"], "core_anti_extension", "abdominals",
    ["shoulders", "lats"], "intermediate", ["ab_wheel"],
    ["Kneel with the wheel below the shoulders and brace the trunk.", "Roll forward while keeping ribs and pelvis stacked, then pull back without piking."],
    ["Squeeze glutes throughout.", "Use only the range you can brace."],
    ["Arching the low back.", "Pulling back by sitting onto the heels."],
  ],
  [
    "stability_ball_leg_curl", "Stability Ball Leg Curl", ["Swiss Ball Hamstring Curl", "Exercise Ball Leg Curl"], "knee_flexion", "hamstrings",
    ["glutes", "core"], "intermediate", ["stability_ball"],
    ["Lie with heels on the ball and lift the hips into a bridge.", "Curl the ball toward the hips while keeping hips high, then extend slowly."],
    ["Drive heels into the ball.", "Keep the pelvis level."],
    ["Letting hips sag.", "Moving too quickly to balance."],
  ],
  [
    "stability_ball_crunch", "Stability Ball Crunch", ["Swiss Ball Crunch", "Exercise Ball Crunch"], "core_flexion", "abdominals",
    [], "beginner", ["stability_ball"],
    ["Lie back over the ball with feet wide and hips supported.", "Curl ribs toward the pelvis, pause, and extend over the ball with control."],
    ["Move through the trunk.", "Keep hips still."],
    ["Pulling on the neck.", "Rocking the hips."],
  ],
  [
    "foam_roller_thoracic_extension", "Foam-Roller Thoracic Extension", ["Thoracic Foam Rolling", "Foam Roller Upper Back Extension"], "mobility", "upper_back",
    ["chest"], "beginner", ["foam_roller"],
    ["Place the roller across the upper back and support the head.", "Gently extend over the roller while keeping ribs controlled, then move to another segment."],
    ["Use small ranges.", "Breathe out into extension."],
    ["Rolling the lower back.", "Forcing the neck backward."],
  ],
  [
    "trx_row", "TRX Row", ["Suspension Row", "TRX Body Row"], "horizontal_pull", "back",
    ["biceps", "rear_deltoids", "core"], "beginner", ["trx"],
    ["Lean back with straps taut and body in a straight line.", "Pull the chest between the handles, pause, and lower as one unit."],
    ["Walk feet forward to progress.", "Keep shoulders down."],
    ["Hips sagging.", "Losing tension in the straps."],
  ],
  [
    "trx_chest_press", "TRX Chest Press", ["Suspension Chest Press", "TRX Push-Up"], "horizontal_push", "chest",
    ["triceps", "shoulders", "core"], "intermediate", ["trx"],
    ["Face away from the anchor with handles at the chest and body leaning forward.", "Lower between the hands, then press away while keeping the body rigid."],
    ["Keep straps off the arms.", "Walk feet back to make it easier."],
    ["Letting hips sag.", "Allowing handles to spread abruptly."],
  ],
  [
    "trx_hamstring_curl", "TRX Hamstring Curl", ["Suspension Hamstring Curl", "TRX Leg Curl"], "knee_flexion", "hamstrings",
    ["glutes", "core"], "intermediate", ["trx"],
    ["Lie with heels in the cradles and lift hips from the floor.", "Pull heels toward the hips while holding the bridge, then extend slowly."],
    ["Keep hips high.", "Press heels down into the straps."],
    ["Dropping the pelvis.", "Rushing the return."],
  ],
  [
    "tire_flip", "Tire Flip", ["Workout Tire Flip", "Tire Flips"], "hip_hinge", "glutes",
    ["quadriceps", "hamstrings", "back"], "advanced", ["tire"],
    ["Set feet close to the tire, brace, and wedge shoulders and hands underneath.", "Drive through the floor to raise it, then step in and push it over."],
    ["Push forward, not just upward.", "Keep the tire close."],
    ["Curling the tire with the arms.", "Rounding the back off the floor."],
  ],
  [
    "battle_rope_alternating_waves", "Battle-Rope Alternating Waves", ["Battle Rope Waves", "Alternating Rope Waves", "Battle Ropes"], "conditioning", "full_body",
    ["shoulders", "arms", "core"], "beginner", ["battle_ropes"],
    ["Stand athletically with one rope end in each hand.", "Alternate quick up-and-down arm drives while keeping the trunk and lower body stable."],
    ["Make waves travel to the anchor.", "Stay relaxed through the grip."],
    ["Standing too upright and rigid.", "Losing wave rhythm immediately."],
  ],
  [
    "band_lateral_walk", "Loop-Band Lateral Walk", ["Banded Lateral Walk", "Band Side Steps", "Lateral Band Walk"], "hip_abduction", "glutes",
    ["hip_abductors", "quadriceps"], "beginner", ["loop_bands"],
    ["Place the loop above the knees or at the ankles and take a shallow squat.", "Step sideways without letting the trailing leg snap in, then reverse direction."],
    ["Keep constant band tension.", "Point knees and toes forward."],
    ["Rocking the torso side to side.", "Dragging the trailing foot."],
  ],
  [
    "band_pull_apart", "Loop-Band Pull-Apart", ["Band Pull Apart", "Resistance Band Pull-Apart"], "shoulder_horizontal_abduction", "rear_deltoids",
    ["upper_back", "rotator_cuff"], "beginner", ["loop_bands"],
    ["Hold the band at shoulder height with arms nearly straight.", "Pull hands apart until the band nears the chest, then return slowly."],
    ["Reach wide through the fingertips.", "Keep shoulders down."],
    ["Arching the low back.", "Bending the elbows to shorten the band."],
  ],
  [
    "banded_squat", "Loop-Band Squat", ["Banded Squat", "Resistance Band Squat"], "squat", "quadriceps",
    ["glutes", "hamstrings"], "beginner", ["loop_bands"],
    ["Place the band above the knees and stand in a comfortable squat stance.", "Maintain outward band tension as you squat and stand through the whole foot."],
    ["Spread the floor with the feet.", "Keep the band centered."],
    ["Letting knees collapse inward.", "Rising onto the toes."],
  ],
];

function freezeArray(values) {
  return Object.freeze([...values]);
}

function createExercise(definition) {
  const [
    id,
    name,
    aliases,
    movementPattern,
    primaryMuscle,
    secondaryMuscles,
    difficulty,
    equipmentIds,
    instructions,
    cues,
    commonMistakes,
  ] = definition;

  return Object.freeze({
    id,
    name,
    aliases: freezeArray(aliases),
    movementPattern,
    primaryMuscle,
    secondaryMuscles: freezeArray(secondaryMuscles),
    difficulty,
    equipmentIds: freezeArray(equipmentIds),
    instructions: freezeArray(instructions),
    cues: freezeArray(cues),
    commonMistakes: freezeArray(commonMistakes),
  });
}

export const EXERCISE_CATALOG = Object.freeze(DEFINITIONS.map(createExercise));

const EXERCISE_BY_ID = new Map();
const NAME_INDEX = new Map();
const SIGNATURE_INDEX = new Map();
const NORMALIZED_NAMES_BY_ID = new Map();

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function inputName(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  return (
    value.name ??
    value.exercise_name ??
    value.exerciseName ??
    value.title ??
    ""
  );
}

/**
 * Normalizes common generated-name variations without changing exercise
 * meaning. The returned value is intended for matching, not display.
 */
export function normalizeExerciseName(value) {
  return inputName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:lb|lbs|pounds?|kg|kgs)\b/g, " ")
    .replace(/\b\d+\s*(?:x|\u00d7)\s*\d+(?:\s*-\s*\d+)?\b/g, " ")
    .replace(/\b(?:db|d\/b)\b/g, "dumbbell")
    .replace(/\b(?:bb|b\/b)\b/g, "barbell")
    .replace(/\brdls?\b/g, "romanian deadlift")
    .replace(/\bohp\b/g, "overhead press")
    .replace(/\btrx\b/g, "trx")
    .replace(/\bpress[\s-]?ups?\b/g, "push up")
    .replace(/\bpush[\s-]?ups?\b/g, "push up")
    .replace(/\bpull[\s-]?ups?\b/g, "pull up")
    .replace(/\bchin[\s-]?ups?\b/g, "chin up")
    .replace(/\bskull[\s-]?crushers?\b/g, "skull crusher")
    .replace(/\b(?:wide|close|narrow|neutral|overhand|underhand|pronated|supinated)[\s-]+grip\b/g, " ")
    .replace(/\b(?:weighted|unweighted|alternating|strict)\b/g, " ")
    .replace(/\bflies\b|\bflyes\b/g, "fly")
    .replace(/\bpresses\b/g, "press")
    .replace(/\brows\b/g, "row")
    .replace(/\bcurls\b/g, "curl")
    .replace(/\bsquats\b/g, "squat")
    .replace(/\blunges\b/g, "lunge")
    .replace(/\braises\b/g, "raise")
    .replace(/\bextensions\b/g, "extension")
    .replace(/\bdeadlifts\b/g, "deadlift")
    .replace(/\bdips\b/g, "dip")
    .replace(/\brollouts\b/g, "rollout")
    .replace(/\bflips\b/g, "flip")
    .replace(/\bwaves\b/g, "wave")
    .replace(/\b(?:the|an|a|exercise)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenSignature(normalizedName) {
  return [...new Set(normalizedName.split(" ").filter(Boolean))].sort().join(" ");
}

function addToIndex(index, key, exercise) {
  if (!key) return;
  const existing = index.get(key);
  if (existing) {
    if (!existing.includes(exercise)) existing.push(exercise);
  } else {
    index.set(key, [exercise]);
  }
}

for (const exercise of EXERCISE_CATALOG) {
  if (EXERCISE_BY_ID.has(exercise.id)) {
    throw new Error("Duplicate canonical exercise ID: " + exercise.id);
  }
  EXERCISE_BY_ID.set(exercise.id, exercise);

  const normalizedNames = [
    normalizeExerciseName(exercise.id),
    normalizeExerciseName(exercise.name),
    ...exercise.aliases.map(normalizeExerciseName),
  ].filter(Boolean);
  const uniqueNames = [...new Set(normalizedNames)];
  NORMALIZED_NAMES_BY_ID.set(exercise.id, uniqueNames);

  for (const normalizedName of uniqueNames) {
    addToIndex(NAME_INDEX, normalizedName, exercise);
    addToIndex(SIGNATURE_INDEX, tokenSignature(normalizedName), exercise);
  }
}

const KNOWN_EQUIPMENT_IDS = new Set([
  "olympic_barbell",
  "ez_bar",
  "landmine",
  "flat_bench",
  "incline_bench",
  "decline_bench",
  "squat_rack",
  "smith_machine",
  "preacher_curl_bench",
  "pull_up_bar",
  "dumbbells",
  "hack_squat_machine",
  "leg_press_machine",
  "chest_supported_row_machine",
  "lat_pulldown_machine",
  "seated_leg_curl_machine",
  "calf_extension_machine",
  "incline_chest_press_machine",
  "abductor_machine",
  "adductor_machine",
  "fly_machine",
  "leg_extension_machine",
  "preacher_curl_machine",
  "lateral_raise_machine",
  "row_machine",
  "crossover_cable",
  "hi_lo_pull_cable",
  "lat_pulldown_cable",
  "row_cable",
  "ab_wheel",
  "stability_ball",
  "foam_roller",
  "trx",
  "tire",
  "sissy_squat_machine",
  "battle_ropes",
  "loop_bands",
]);

const EQUIPMENT_ALIASES = Object.freeze({
  barbell: "olympic_barbell",
  olympic_bar: "olympic_barbell",
  ez_curl_bar: "ez_bar",
  ezbar: "ez_bar",
  bench: "flat_bench",
  preacher_bench: "preacher_curl_bench",
  pullup_bar: "pull_up_bar",
  dumbbell: "dumbbells",
  db: "dumbbells",
  hack_squat: "hack_squat_machine",
  leg_press: "leg_press_machine",
  chest_supported_row: "chest_supported_row_machine",
  lat_pulldown: "lat_pulldown_machine",
  seated_leg_curl: "seated_leg_curl_machine",
  calf_extension: "calf_extension_machine",
  incline_chest_press: "incline_chest_press_machine",
  hip_abductor_machine: "abductor_machine",
  hip_adductor_machine: "adductor_machine",
  pec_deck: "fly_machine",
  pec_fly_machine: "fly_machine",
  leg_extension: "leg_extension_machine",
  machine_preacher_curl: "preacher_curl_machine",
  machine_lateral_raise: "lateral_raise_machine",
  seated_row_machine: "row_machine",
  cable_crossover: "crossover_cable",
  cable_machine: "hi_lo_pull_cable",
  high_low_cable: "hi_lo_pull_cable",
  high_low_pull_cable: "hi_lo_pull_cable",
  hi_low_pull_cable: "hi_lo_pull_cable",
  cable_lat_pulldown: "lat_pulldown_cable",
  seated_row_cable: "row_cable",
  swiss_ball: "stability_ball",
  exercise_ball: "stability_ball",
  suspension_trainer: "trx",
  trx_suspension_trainer: "trx",
  workout_tire: "tire",
  resistance_bands: "loop_bands",
  loop_resistance_bands: "loop_bands",
  battle_rope: "battle_ropes",
});

export function normalizeEquipmentId(value) {
  const raw =
    value && typeof value === "object"
      ? value.id ?? value.equipment_id ?? value.equipmentId ?? value.name
      : value;
  const key = normalizeKey(raw);
  if (!key) return "";
  if (KNOWN_EQUIPMENT_IDS.has(key)) return key;
  return EQUIPMENT_ALIASES[key] ?? key;
}

function equipmentSet(selectedEquipment) {
  if (selectedEquipment == null) return null;

  let values;
  if (selectedEquipment instanceof Set || Array.isArray(selectedEquipment)) {
    values = [...selectedEquipment];
  } else {
    values = [selectedEquipment];
  }

  return new Set(values.map(normalizeEquipmentId).filter(Boolean));
}

function canonicalId(value) {
  return normalizeKey(value);
}

export function getExerciseById(id) {
  return EXERCISE_BY_ID.get(canonicalId(id)) ?? null;
}

function normalizedClassification(value) {
  return normalizeKey(value);
}

function chooseWithHints(candidates, input) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  if (!input || typeof input !== "object") return null;

  let narrowed = [...candidates];
  const equipmentHint = normalizeEquipmentId(
    input.equipment_id ?? input.equipmentId ?? input.primaryEquipmentId,
  );
  if (equipmentHint) {
    const matches = narrowed.filter((item) =>
      item.equipmentIds.includes(equipmentHint),
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) narrowed = matches;
  }

  const muscleHint = normalizedClassification(
    input.primaryMuscle ?? input.muscle_group ?? input.muscleGroup,
  );
  if (muscleHint) {
    const matches = narrowed.filter(
      (item) => item.primaryMuscle === muscleHint,
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) narrowed = matches;
  }

  const movementHint = normalizedClassification(
    input.movementPattern ?? input.movement_pattern,
  );
  if (movementHint) {
    const matches = narrowed.filter(
      (item) => item.movementPattern === movementHint,
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) narrowed = matches;
  }

  return narrowed.length === 1 ? narrowed[0] : null;
}

function nameSimilarity(query, candidate) {
  if (query === candidate) return 1;
  const queryTokens = new Set(query.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  if (!queryTokens.size || !candidateTokens.size) return 0;

  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }

  const queryCoverage = overlap / queryTokens.size;
  const candidateCoverage = overlap / candidateTokens.size;
  let score = queryCoverage * 0.65 + candidateCoverage * 0.35;
  if (query.includes(candidate) || candidate.includes(query)) score += 0.08;
  return Math.min(score, 1);
}

/**
 * Resolves a canonical ID, catalog name, alias, or generated exercise object
 * to a catalog entry. Ambiguous fuzzy matches return null.
 */
export function resolveExercise(exerciseOrName) {
  if (exerciseOrName == null) return null;

  if (typeof exerciseOrName === "object") {
    const possibleIds = [
      exerciseOrName.canonicalExerciseId,
      exerciseOrName.canonical_exercise_id,
      exerciseOrName.exerciseId,
      exerciseOrName.exercise_id,
      exerciseOrName.id,
    ];
    for (const possibleId of possibleIds) {
      const byId = getExerciseById(possibleId);
      if (byId) return byId;
    }
  } else {
    const byId = getExerciseById(exerciseOrName);
    if (byId) return byId;
  }

  const normalizedName = normalizeExerciseName(exerciseOrName);
  if (!normalizedName) return null;

  const exact = chooseWithHints(NAME_INDEX.get(normalizedName), exerciseOrName);
  if (exact) return exact;

  const reordered = chooseWithHints(
    SIGNATURE_INDEX.get(tokenSignature(normalizedName)),
    exerciseOrName,
  );
  if (reordered) return reordered;

  const scored = EXERCISE_CATALOG.map((exercise) => {
    const score = Math.max(
      ...NORMALIZED_NAMES_BY_ID.get(exercise.id).map((candidate) =>
        nameSimilarity(normalizedName, candidate),
      ),
    );
    return { exercise, score };
  }).sort((a, b) => b.score - a.score);

  const bestScore = scored[0]?.score ?? 0;
  const nextScore = scored[1]?.score ?? 0;
  if (bestScore < 0.72 || bestScore - nextScore < 0.06) return null;
  return scored[0].exercise;
}

export function getCanonicalExerciseId(exerciseOrName) {
  return resolveExercise(exerciseOrName)?.id ?? null;
}

/**
 * Null/undefined means "do not filter by equipment". An explicit empty
 * selection permits only entries whose equipmentIds array is empty.
 */
export function isExerciseAvailable(exerciseOrId, selectedEquipment) {
  const exercise =
    resolveExercise(exerciseOrId) ??
    (exerciseOrId &&
    typeof exerciseOrId === "object" &&
    Array.isArray(exerciseOrId.equipmentIds)
      ? exerciseOrId
      : null);
  if (!exercise) return false;

  const selected = equipmentSet(selectedEquipment);
  if (selected === null) return true;
  return exercise.equipmentIds.every((id) => selected.has(id));
}

function optionMatches(actual, requested) {
  if (requested == null || requested === "") return true;
  const requestedValues =
    requested instanceof Set || Array.isArray(requested)
      ? [...requested]
      : [requested];
  return requestedValues
    .map(normalizedClassification)
    .filter(Boolean)
    .includes(actual);
}

function normalizedLimit(value) {
  if (value == null) return Infinity;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Infinity;
  return Math.max(0, Math.floor(numeric));
}

/**
 * Searches names, aliases, classifications, and IDs. All filters are optional:
 * selectedEquipment, movementPattern, primaryMuscle, difficulty, and limit.
 */
export function searchExercises(query = "", options = {}) {
  const normalizedQuery = normalizeExerciseName(query);
  const selectedEquipment =
    options.selectedEquipment ?? options.equipment ?? null;

  const matches = EXERCISE_CATALOG.filter(
    (exercise) =>
      optionMatches(exercise.movementPattern, options.movementPattern) &&
      optionMatches(exercise.primaryMuscle, options.primaryMuscle) &&
      optionMatches(exercise.difficulty, options.difficulty) &&
      isExerciseAvailable(exercise, selectedEquipment),
  ).map((exercise, catalogIndex) => {
    if (!normalizedQuery) return { exercise, score: 0, catalogIndex };

    const nameScore = Math.max(
      ...NORMALIZED_NAMES_BY_ID.get(exercise.id).map((candidate) =>
        nameSimilarity(normalizedQuery, candidate),
      ),
    );
    const classificationText = [
      exercise.movementPattern,
      exercise.primaryMuscle,
      ...exercise.secondaryMuscles,
    ]
      .join(" ")
      .replace(/_/g, " ");
    const classificationScore = nameSimilarity(
      normalizedQuery,
      classificationText,
    ) * 0.7;
    return {
      exercise,
      score: Math.max(nameScore, classificationScore),
      catalogIndex,
    };
  });

  const filtered = normalizedQuery
    ? matches.filter((match) => match.score >= 0.2)
    : matches;
  filtered.sort(
    (a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex,
  );

  return filtered
    .slice(0, normalizedLimit(options.limit))
    .map((match) => match.exercise);
}

const DIFFICULTY_RANK = Object.freeze({
  beginner: 0,
  intermediate: 1,
  advanced: 2,
});

function sharedSecondaryMuscles(left, right) {
  const rightMuscles = new Set(right.secondaryMuscles);
  return left.secondaryMuscles.reduce(
    (total, muscle) => total + (rightMuscles.has(muscle) ? 1 : 0),
    0,
  );
}

/**
 * Returns catalog objects, not IDs. Movement pattern and primary muscle are
 * preserved by default. Pass sameMovementPattern: false or
 * samePrimaryMuscle: false to relax either constraint.
 */
export function getExerciseAlternatives(
  exerciseOrId,
  selectedEquipment,
  options = {},
) {
  const source = resolveExercise(exerciseOrId);
  if (!source) return [];

  const sameMovementPattern =
    (options.sameMovementPattern ?? options.sameMovement) !== false;
  const samePrimaryMuscle =
    (options.samePrimaryMuscle ?? options.sameMuscle) !== false;
  const includeOriginal = options.includeOriginal === true;
  const excludedIds = new Set(
    (options.excludeIds ?? []).map((value) => {
      const resolved = resolveExercise(value);
      return resolved?.id ?? canonicalId(value);
    }),
  );

  const candidates = EXERCISE_CATALOG.map((exercise, catalogIndex) => ({
    exercise,
    catalogIndex,
  })).filter(({ exercise }) => {
    if (!includeOriginal && exercise.id === source.id) return false;
    if (excludedIds.has(exercise.id)) return false;
    if (
      sameMovementPattern &&
      exercise.movementPattern !== source.movementPattern
    ) {
      return false;
    }
    if (samePrimaryMuscle && exercise.primaryMuscle !== source.primaryMuscle) {
      return false;
    }
    if (
      !optionMatches(exercise.movementPattern, options.movementPattern) ||
      !optionMatches(exercise.primaryMuscle, options.primaryMuscle) ||
      !optionMatches(exercise.difficulty, options.difficulty)
    ) {
      return false;
    }
    return isExerciseAvailable(exercise, selectedEquipment);
  });

  candidates.sort((left, right) => {
    const leftDifficulty =
      Math.abs(
        (DIFFICULTY_RANK[left.exercise.difficulty] ?? 0) -
          (DIFFICULTY_RANK[source.difficulty] ?? 0),
      );
    const rightDifficulty =
      Math.abs(
        (DIFFICULTY_RANK[right.exercise.difficulty] ?? 0) -
          (DIFFICULTY_RANK[source.difficulty] ?? 0),
      );
    if (leftDifficulty !== rightDifficulty) {
      return leftDifficulty - rightDifficulty;
    }

    const leftShared = sharedSecondaryMuscles(source, left.exercise);
    const rightShared = sharedSecondaryMuscles(source, right.exercise);
    return rightShared - leftShared || left.catalogIndex - right.catalogIndex;
  });

  return candidates
    .slice(0, normalizedLimit(options.limit))
    .map(({ exercise }) => exercise);
}
