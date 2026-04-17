const DEFAULT_LEVEL = 'beginner';
const DEFAULT_TIME_PER_DAY = 40;
const DEFAULT_PREFERRED_TIME = 'evening';

const LEVEL_CONFIG = {
  beginner: { min: 10, max: 25, daysPerWeek: 5, phaseCount: 3, difficulty: 'easy' },
  intermediate: { min: 20, max: 45, daysPerWeek: 5, phaseCount: 4, difficulty: 'medium' },
  advanced: { min: 30, max: 60, daysPerWeek: 6, phaseCount: 4, difficulty: 'hard' }
};

const TIME_WINDOWS = {
  morning: { start: 7 * 60, end: 9 * 60 },
  afternoon: { start: 13 * 60, end: 17 * 60 },
  evening: { start: 18 * 60, end: 21 * 60 }
};

const CATEGORY_KEYWORDS = [
  {
    category: 'Language Learning',
    patterns: /english|spanish|japanese|korean|french|german|language|vocabulary|grammar|listening|speaking/i
  },
  {
    category: 'Programming / Tech Skills',
    patterns: /code|coding|program|web dev|javascript|typescript|python|java|react|node|sql|api|data structure|algorithm|tech/i
  },
  {
    category: 'Creative Skills',
    patterns: /draw|drawing|music|guitar|piano|sing|song|writing|poetry|design|photography|creative/i
  },
  {
    category: 'Fitness & Health',
    patterns: /gym|fitness|workout|run|running|yoga|cardio|weight loss|muscle|health|diet|nutrition|sleep/i
  },
  {
    category: 'Communication Skills',
    patterns: /public speaking|presentation|conversation|communicat|social skill|networking|storytelling|negotiation/i
  },
  {
    category: 'Productivity & Self-Improvement',
    patterns: /productivity|discipline|focus|time management|habit|routine|self improvement|procrastination/i
  },
  {
    category: 'Academic Learning',
    patterns: /math|physics|chemistry|biology|history|exam|study|studying|school|university|academic/i
  },
  {
    category: 'Business & Career',
    patterns: /marketing|sales|startup|entrepreneur|business|career|management|leadership|finance|branding/i
  },
  {
    category: 'Mental & Emotional Skills',
    patterns: /confidence|emotional|mindset|anxiety|stress|self esteem|love|relationship|mindfulness|resilience/i
  }
];

const FRAMEWORKS = {
  'Language Learning': ['Vocabulary & basics', 'Listening & comprehension', 'Speaking practice', 'Real-life usage'],
  'Programming / Tech Skills': ['Fundamentals', 'Practice problems', 'Build projects', 'Optimization'],
  'Creative Skills': ['Fundamentals', 'Technique practice', 'Creation', 'Refinement'],
  'Fitness & Health': ['Form & basics', 'Strength building', 'Consistency', 'Progress tracking'],
  'Communication Skills': ['Understanding communication', 'Practice speaking', 'Real interaction', 'Feedback & improvement'],
  'Productivity & Self-Improvement': ['Awareness', 'Habit building', 'System building', 'Optimization'],
  'Academic Learning': ['Theory understanding', 'Practice', 'Testing', 'Review'],
  'Business & Career': ['Fundamentals', 'Strategy', 'Execution', 'Scaling'],
  'Mental & Emotional Skills': ['Awareness', 'Control', 'Expression', 'Application'],
  Other: ['Foundations', 'Practice', 'Application', 'Review']
};

function normalizeLevel(level) {
  const normalized = String(level || DEFAULT_LEVEL).trim().toLowerCase();
  return LEVEL_CONFIG[normalized] ? normalized : DEFAULT_LEVEL;
}

function normalizePreferredTime(preferredTime) {
  const normalized = String(preferredTime || DEFAULT_PREFERRED_TIME).trim().toLowerCase();
  return TIME_WINDOWS[normalized] ? normalized : DEFAULT_PREFERRED_TIME;
}

function parseAvailableMinutes(availableTimePerDay, availableTime) {
  const source = availableTimePerDay != null && availableTimePerDay !== ''
    ? availableTimePerDay
    : availableTime;

  if (source == null || source === '') {
    return DEFAULT_TIME_PER_DAY;
  }

  if (typeof source === 'number' && Number.isFinite(source)) {
    return Math.max(20, Math.min(180, Math.round(source)));
  }

  const raw = String(source).trim().toLowerCase();
  const hoursMatch = raw.match(/(\d+(?:\.\d+)?)\s*h(?:our|ours)?/);
  const minutesMatch = raw.match(/(\d+)\s*m(?:in|ins|inute|inutes)?/);

  let total = 0;
  if (hoursMatch) total += Math.round(parseFloat(hoursMatch[1]) * 60);
  if (minutesMatch) total += parseInt(minutesMatch[1], 10);

  if (!total) {
    const numeric = raw.match(/\d+/);
    total = numeric ? parseInt(numeric[0], 10) : DEFAULT_TIME_PER_DAY;
  }

  return Math.max(20, Math.min(180, total));
}

function classifyGoal(goal) {
  const normalized = String(goal || '').trim();
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.patterns.test(normalized)) {
      return rule.category;
    }
  }

  if (/learn|improve|better|skill/i.test(normalized)) {
    return 'Productivity & Self-Improvement';
  }

  return 'Other';
}

function normalizeGoal(goal, category) {
  const rawGoal = String(goal || '').trim();

  if (/learn how to love someone|love someone|relationship/i.test(rawGoal)) {
    return 'Build emotional intelligence and healthy communication skills';
  }

  const cleaned = rawGoal
    .replace(/^\s*(learn|study|master|improve|build|get better at)\s+/i, '')
    .trim();

  if (!cleaned) {
    return category === 'Other' ? 'Develop a practical life skill' : `Develop ${category.toLowerCase()} fundamentals`;
  }

  if (/better|improve more|practice more|be good/i.test(cleaned)) {
    return `Develop practical ${cleaned.replace(/\b(more|better)\b/gi, '').trim()} skills`;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function toHHMM(totalMinutes) {
  const safe = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function createDurations(level, availableMinutes, habitCount) {
  const { min, max } = LEVEL_CONFIG[level];
  const safeCount = Math.max(1, habitCount);
  let base = Math.floor((availableMinutes / safeCount) / 5) * 5;
  base = Math.max(min, Math.min(max, base));

  const durations = Array.from({ length: safeCount }, () => base);
  while (durations.reduce((a, b) => a + b, 0) > availableMinutes) {
    let adjusted = false;
    for (let i = durations.length - 1; i >= 0; i -= 1) {
      if (durations[i] > 5) {
        durations[i] -= 5;
        adjusted = true;
      }
      if (durations.reduce((a, b) => a + b, 0) <= availableMinutes) break;
    }
    if (!adjusted) break;
  }

  return durations;
}

function createTimes(durations, preferredTime) {
  const window = TIME_WINDOWS[preferredTime];
  const times = [];
  let cursor = window.start;

  for (let i = 0; i < durations.length; i += 1) {
    const duration = durations[i];
    if (cursor + duration > window.end) {
      cursor = Math.max(window.start, window.end - duration);
    }
    times.push(toHHMM(cursor));
    cursor += duration + 25;
  }

  return times;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
}

function createHabitId(phaseId, index, goal) {
  return `h-${phaseId}-${index + 1}-${slugify(goal) || 'goal'}`;
}

function buildPhaseDescription(category, phaseName, normalizedGoal) {
  return `Focus on ${phaseName.toLowerCase()} for ${normalizedGoal.toLowerCase()} with consistent daily execution.`;
}

function buildHabitTemplates(category, phaseName, normalizedGoal) {
  const skill = normalizedGoal;

  const templates = {
    'Language Learning': {
      'Vocabulary & basics': [
        { name: `Review 12 core words in ${skill}`, description: 'Use flashcards and speak each word in a sentence.', priority: 'high' },
        { name: 'Complete one basic grammar drill', description: 'Do 8 short grammar items and correct mistakes.', priority: 'medium' }
      ],
      'Listening & comprehension': [
        { name: `Listen to 10 minutes of ${skill} audio`, description: 'Write down 5 phrases you recognize.', priority: 'high' },
        { name: 'Replay and summarize key ideas', description: 'Summarize the audio in 3 short lines.', priority: 'medium' }
      ],
      'Speaking practice': [
        { name: `Speak aloud in ${skill} for 5 minutes`, description: 'Use a daily topic and record your voice.', priority: 'high' },
        { name: 'Practice pronunciation corrections', description: 'Repeat 10 difficult words with clear pronunciation.', priority: 'medium' }
      ],
      'Real-life usage': [
        { name: `Use ${skill} in one real interaction`, description: 'Send one message or have one short conversation.', priority: 'high' },
        { name: 'Reflect on mistakes and retry', description: 'Fix 3 mistakes from today and re-speak them.', priority: 'medium' }
      ]
    },
    'Programming / Tech Skills': {
      Fundamentals: [
        { name: `Study one core concept in ${skill}`, description: 'Take concise notes with one practical example.', priority: 'high' },
        { name: 'Implement one small example', description: 'Write and run one small code snippet from the concept.', priority: 'medium' }
      ],
      'Practice problems': [
        { name: 'Solve 2 focused practice problems', description: 'Solve and explain your approach for each problem.', priority: 'high' },
        { name: 'Debug one broken snippet', description: 'Fix one bug and document the root cause in 2 lines.', priority: 'medium' }
      ],
      'Build projects': [
        { name: 'Build one mini feature', description: 'Ship one usable feature for your practice project.', priority: 'high' },
        { name: 'Refactor one module', description: 'Improve naming, structure, and readability in one file.', priority: 'medium' }
      ],
      Optimization: [
        { name: 'Profile and optimize one workflow', description: 'Improve one slow or repetitive coding task.', priority: 'high' },
        { name: 'Write technical review notes', description: 'Capture 3 wins and one next optimization target.', priority: 'medium' }
      ]
    },
    'Creative Skills': {
      Fundamentals: [
        { name: `Practice one foundational drill for ${skill}`, description: 'Complete one warm-up focused on core basics.', priority: 'high' },
        { name: 'Study one reference example', description: 'Analyze one strong example and note 3 techniques.', priority: 'medium' }
      ],
      'Technique practice': [
        { name: 'Repeat one technical exercise', description: 'Run 3 focused rounds with quality over speed.', priority: 'high' },
        { name: 'Fix one weak technique area', description: 'Choose one weakness and retrain it deliberately.', priority: 'medium' }
      ],
      Creation: [
        { name: `Create one mini output in ${skill}`, description: 'Produce one small complete piece each day.', priority: 'high' },
        { name: 'Share or review your output', description: 'Get feedback or self-review with 3 improvement notes.', priority: 'medium' }
      ],
      Refinement: [
        { name: 'Refine yesterday’s work', description: 'Improve details, clarity, and presentation quality.', priority: 'high' },
        { name: 'Build a personal quality checklist', description: 'Track consistency with a 5-point checklist.', priority: 'medium' }
      ]
    },
    'Fitness & Health': {
      'Form & basics': [
        { name: 'Practice movement form for 2 exercises', description: 'Do slow reps with strict posture and control.', priority: 'high' },
        { name: 'Complete a 10-minute mobility routine', description: 'Open hips, back, and shoulders before training.', priority: 'medium' }
      ],
      'Strength building': [
        { name: 'Complete one progressive strength block', description: 'Track sets, reps, and effort after each session.', priority: 'high' },
        { name: 'Log nutrition and hydration basics', description: 'Record protein intake and daily water target.', priority: 'medium' }
      ],
      Consistency: [
        { name: 'Hit your workout streak target', description: 'Finish today’s planned workout without skipping.', priority: 'high' },
        { name: 'Do a short recovery cooldown', description: 'Stretch and breathe for recovery after exercise.', priority: 'medium' }
      ],
      'Progress tracking': [
        { name: 'Track one measurable metric', description: 'Log body, strength, or endurance progress daily.', priority: 'high' },
        { name: 'Adjust next workout plan', description: 'Update tomorrow’s workout from today’s performance.', priority: 'medium' }
      ]
    },
    'Communication Skills': {
      'Understanding communication': [
        { name: 'Study one communication principle', description: 'Learn one principle and write one practical example.', priority: 'high' },
        { name: 'Observe one conversation pattern', description: 'Identify tone, pacing, and listening cues.', priority: 'medium' }
      ],
      'Practice speaking': [
        { name: 'Speak on one topic for 4 minutes', description: 'Record yourself and review clarity and pace.', priority: 'high' },
        { name: 'Practice active listening drill', description: 'Repeat what the other person said before responding.', priority: 'medium' }
      ],
      'Real interaction': [
        { name: 'Start one intentional conversation', description: 'Use one open-ended question to lead the talk.', priority: 'high' },
        { name: 'Apply one empathy response', description: 'Acknowledge emotion before offering your point.', priority: 'medium' }
      ],
      'Feedback & improvement': [
        { name: 'Request feedback on one interaction', description: 'Ask for one improvement point from a trusted person.', priority: 'high' },
        { name: 'Refine one speaking habit', description: 'Fix one filler-word or pacing issue today.', priority: 'medium' }
      ]
    },
    'Productivity & Self-Improvement': {
      Awareness: [
        { name: 'Run a 5-minute daily reflection', description: 'List top distractions and top wins from today.', priority: 'high' },
        { name: 'Define top 3 priorities', description: 'Set only three high-impact tasks for the day.', priority: 'medium' }
      ],
      'Habit building': [
        { name: 'Execute one anchor habit block', description: 'Start with your highest-value habit at fixed time.', priority: 'high' },
        { name: 'Use a 25-minute focus sprint', description: 'Complete one deep-work sprint without interruptions.', priority: 'medium' }
      ],
      'System building': [
        { name: 'Design your daily workflow template', description: 'Create a repeatable plan for work and recovery.', priority: 'high' },
        { name: 'Automate one repetitive task', description: 'Use a checklist or tool to save daily time.', priority: 'medium' }
      ],
      Optimization: [
        { name: 'Measure focus score each day', description: 'Track completion rate and adjust your routine.', priority: 'high' },
        { name: 'Iterate your system weekly', description: 'Keep what works and remove one friction point.', priority: 'medium' }
      ]
    },
    'Academic Learning': {
      'Theory understanding': [
        { name: `Study one core concept in ${skill}`, description: 'Read and summarize key theory in 5 bullet points.', priority: 'high' },
        { name: 'Create one quick concept map', description: 'Connect the concept to previous topics.', priority: 'medium' }
      ],
      Practice: [
        { name: 'Solve 5 targeted practice questions', description: 'Focus on one topic and review mistakes.', priority: 'high' },
        { name: 'Explain one solution aloud', description: 'Teach the method in your own words.', priority: 'medium' }
      ],
      Testing: [
        { name: 'Do one timed mini test', description: 'Simulate exam pressure for one short section.', priority: 'high' },
        { name: 'Review accuracy and timing', description: 'Log score and identify one weak topic.', priority: 'medium' }
      ],
      Review: [
        { name: 'Run a spaced review session', description: 'Revisit old mistakes and difficult concepts.', priority: 'high' },
        { name: 'Prepare tomorrow’s revision target', description: 'Plan one specific chapter or question type.', priority: 'medium' }
      ]
    },
    'Business & Career': {
      Fundamentals: [
        { name: `Study one core topic in ${skill}`, description: 'Capture key frameworks and one practical example.', priority: 'high' },
        { name: 'Review one case study', description: 'Extract one strategy you can apply today.', priority: 'medium' }
      ],
      Strategy: [
        { name: 'Plan one weekly strategic objective', description: 'Define one measurable outcome and action steps.', priority: 'high' },
        { name: 'Analyze one market signal', description: 'Track trends and note one opportunity.', priority: 'medium' }
      ],
      Execution: [
        { name: 'Execute one high-impact action', description: 'Ship one deliverable tied to your objective.', priority: 'high' },
        { name: 'Do one stakeholder update', description: 'Communicate progress in concise business language.', priority: 'medium' }
      ],
      Scaling: [
        { name: 'Standardize one repeatable process', description: 'Create a simple SOP for a repeated task.', priority: 'high' },
        { name: 'Track one growth KPI', description: 'Review daily metric and improve decision quality.', priority: 'medium' }
      ]
    },
    'Mental & Emotional Skills': {
      Awareness: [
        { name: 'Journal emotional check-in for 5 minutes', description: 'Name emotions and their main triggers.', priority: 'high' },
        { name: 'Practice mindful breathing', description: 'Do one 5-minute breathing reset session.', priority: 'medium' }
      ],
      Control: [
        { name: 'Use one emotional regulation drill', description: 'Pause, label, and reframe before reacting.', priority: 'high' },
        { name: 'Apply a stress reset routine', description: 'Use breathing + body release for tension control.', priority: 'medium' }
      ],
      Expression: [
        { name: 'Express one feeling clearly', description: 'Use calm, direct language in one conversation.', priority: 'high' },
        { name: 'Practice assertive communication', description: 'State one boundary respectfully and clearly.', priority: 'medium' }
      ],
      Application: [
        { name: 'Handle one real-life emotional challenge', description: 'Apply your regulation method during pressure.', priority: 'high' },
        { name: 'Reflect and refine your response', description: 'Write what worked and what to improve next time.', priority: 'medium' }
      ]
    },
    Other: {
      Foundations: [
        { name: `Learn one key concept for ${skill}`, description: 'Capture practical notes and one action item.', priority: 'high' },
        { name: 'Do one guided beginner exercise', description: 'Complete one structured exercise with feedback.', priority: 'medium' }
      ],
      Practice: [
        { name: 'Complete one focused practice block', description: 'Practice consistently for one timed session.', priority: 'high' },
        { name: 'Fix one weak area', description: 'Identify and improve one recurring mistake.', priority: 'medium' }
      ],
      Application: [
        { name: 'Apply skill in a real mini task', description: 'Use today’s learning in one practical output.', priority: 'high' },
        { name: 'Record results and lessons', description: 'Write two lessons learned from today’s output.', priority: 'medium' }
      ],
      Review: [
        { name: 'Review your progress snapshot', description: 'Check streak quality and completion quality.', priority: 'high' },
        { name: 'Plan next improvement target', description: 'Set one concrete focus for tomorrow.', priority: 'medium' }
      ]
    }
  };

  const categoryTemplates = templates[category] || templates.Other;
  return categoryTemplates[phaseName] || templates.Other[phaseName] || templates.Other.Foundations;
}

function generateLearningRoadmap(input = {}) {
  const goal = String(input.goal || '').trim();
  if (!goal) {
    throw new Error('Goal is required.');
  }

  const level = normalizeLevel(input.level);
  const availableMinutes = parseAvailableMinutes(input.available_time_per_day, input.available_time);
  const preferredTime = normalizePreferredTime(input.preferred_time);

  const category = classifyGoal(goal);
  const normalizedGoal = normalizeGoal(goal, category);

  const phaseNames = (FRAMEWORKS[category] || FRAMEWORKS.Other).slice(0, LEVEL_CONFIG[level].phaseCount);
  const habitCountPerPhase = 2;
  const durations = createDurations(level, availableMinutes, habitCountPerPhase);
  const times = createTimes(durations, preferredTime);

  const phases = phaseNames.map((phaseName, phaseIndex) => {
    const phaseId = phaseIndex + 1;
    const habitsTemplate = buildHabitTemplates(category, phaseName, normalizedGoal).slice(0, 2);

    const habits = habitsTemplate.map((habitTemplate, habitIndex) => ({
      habit_id: createHabitId(phaseId, habitIndex, `${goal}-${habitTemplate.name}`),
      name: habitTemplate.name,
      description: habitTemplate.description,
      duration: durations[habitIndex],
      time: times[habitIndex],
      frequency: 'daily',
      days_per_week: LEVEL_CONFIG[level].daysPerWeek,
      suggested_time: times[habitIndex],
      duration_minutes: durations[habitIndex],
      difficulty: LEVEL_CONFIG[level].difficulty,
      priority: habitTemplate.priority
    }));

    return {
      phase_id: phaseId,
      phase_name: phaseName,
      description: buildPhaseDescription(category, phaseName, normalizedGoal),
      estimated_duration: level === 'beginner' ? '1-2 weeks' : '2-3 weeks',
      habits
    };
  });

  return {
    goal,
    category,
    normalized_goal: normalizedGoal,
    summary: `A ${level}-level roadmap for ${normalizedGoal.toLowerCase()} using the ${category} framework.`,
    phases
  };
}

module.exports = {
  generateLearningRoadmap
};
