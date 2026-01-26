<?php
/**
 * AI Council API Endpoint
 * Multi-domain questioning system with 8 expert perspectives
 *
 * Endpoints:
 *   POST /api/ai-council/generate - Generate 8 domain-specific questions
 */

declare(strict_types=1);

use CoachSearching\Api\Response;
use CoachSearching\Api\Auth;

require_once __DIR__ . '/../lib/OpenRouter.php';

// Define the 8 domains
const AI_COUNCIL_DOMAINS = [
    'inner_peace' => [
        'en' => 'Inner Peace',
        'de' => 'Innerer Frieden',
        'expert' => 'mindfulness and meditation expert'
    ],
    'happiness' => [
        'en' => 'Happiness',
        'de' => 'Glück',
        'expert' => 'positive psychology expert'
    ],
    'family' => [
        'en' => 'Family',
        'de' => 'Familie',
        'expert' => 'family therapist and relationship counselor'
    ],
    'friends' => [
        'en' => 'Friends',
        'de' => 'Freunde',
        'expert' => 'social dynamics and friendship expert'
    ],
    'fitness' => [
        'en' => 'Fitness',
        'de' => 'Fitness',
        'expert' => 'health and fitness coach'
    ],
    'finance' => [
        'en' => 'Finance',
        'de' => 'Finanzen',
        'expert' => 'financial advisor and wealth coach'
    ],
    'business' => [
        'en' => 'Business',
        'de' => 'Business',
        'expert' => 'business strategist and entrepreneurship mentor'
    ],
    'education' => [
        'en' => 'Education',
        'de' => 'Bildung',
        'expert' => 'learning and personal development expert'
    ]
];

/**
 * Handle AI Council requests
 */
function handleAICouncil(string $method, ?string $action, ?string $subAction, array $input): void
{
    // All AI Council endpoints require authentication
    Auth::required();

    if ($method !== 'POST') {
        Response::error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
        return;
    }

    switch ($action) {
        case 'generate':
            generateCouncilQuestions($input);
            break;
        default:
            Response::notFound('Endpoint');
    }
}

/**
 * Generate 8 domain-specific questions based on conversation
 */
function generateCouncilQuestions(array $input): void
{
    $initialMessage = $input['initialUserMessage'] ?? '';
    $conversation = $input['conversation'] ?? [];
    $language = $input['language'] ?? 'en';

    if (empty($initialMessage)) {
        Response::error('Initial message is required', 400, 'MISSING_INITIAL_MESSAGE');
        return;
    }

    // Build the conversation context
    $conversationContext = buildCouncilConversationContext($initialMessage, $conversation);

    // Build the system prompt
    $systemPrompt = buildCouncilSystemPrompt($language);

    // Build the user prompt
    $userPrompt = buildCouncilUserPrompt($initialMessage, $conversation, $conversationContext, $language);

    // Call OpenRouter API with the specified model
    $openRouter = new OpenRouter();

    $result = $openRouter->chat([
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt]
    ], [
        'model' => 'tngtech/deepseek-r1t2-chimera:free',
        'temperature' => 0.8,
        'max_tokens' => 2048,
        'json_response' => true
    ]);

    if (!$result['success']) {
        // Use fallback questions on AI error
        $questionsData = generateFallbackCouncilQuestions($initialMessage, $language);
    } else {
        // Parse the AI response
        $aiContent = $result['content'];
        $questionsData = json_decode($aiContent, true);

        // Try to extract JSON if wrapped in text
        if (!$questionsData || !isset($questionsData['questions'])) {
            preg_match('/\{[\s\S]*\}/', $aiContent, $matches);
            if (!empty($matches[0])) {
                $questionsData = json_decode($matches[0], true);
            }
        }

        // Use fallback if parsing failed
        if (!$questionsData || !isset($questionsData['questions'])) {
            $questionsData = generateFallbackCouncilQuestions($initialMessage, $language);
        }
    }

    // Build response
    $newQuestions = array_map(function($q, $index) {
        return [
            'id' => $index + 1,
            'domain' => $q['domain'],
            'q' => $q['question']
        ];
    }, $questionsData['questions'], array_keys($questionsData['questions']));

    Response::success([
        'initialUserMessage' => $initialMessage,
        'conversation' => $conversation,
        'newQuestions' => $newQuestions
    ]);
}

/**
 * Build conversation context from history
 */
function buildCouncilConversationContext(string $initialMessage, array $conversation): string
{
    $context = "User's initial topic: " . $initialMessage . "\n\n";

    if (!empty($conversation)) {
        $context .= "Conversation history:\n";
        foreach ($conversation as $index => $exchange) {
            $context .= "Q" . ($index + 1) . " (Domain: " . $exchange['q']['domain'] . "): " . $exchange['q']['q'] . "\n";
            $context .= "A" . ($index + 1) . ": " . $exchange['a'] . "\n\n";
        }
    }

    return $context;
}

/**
 * Build system prompt for AI Council
 */
function buildCouncilSystemPrompt(string $language): string
{
    $langInstruction = $language === 'de'
        ? 'Antworte auf Deutsch. Alle Fragen müssen auf Deutsch formuliert sein.'
        : 'Respond in English. All questions must be in English.';

    $domainList = '';
    foreach (AI_COUNCIL_DOMAINS as $key => $domain) {
        $name = $domain[$language] ?? $domain['en'];
        $expert = $domain['expert'];
        $domainList .= "- {$key} ({$name}): Act as a {$expert}\n";
    }

    return <<<PROMPT
You are the AI Council - a panel of 8 expert advisors, each specialized in a different life domain. Your role is to help users explore their topics, problems, or goals by asking thoughtful, OPEN-ENDED questions from each domain perspective.

**IMPORTANT LANGUAGE INSTRUCTION:** {$langInstruction}

**THE 8 DOMAINS AND YOUR EXPERT ROLES:**
{$domainList}

**CRITICAL RULES:**
1. Generate exactly 8 questions - one for each domain
2. ALL questions MUST be OPEN-ENDED (not answerable with yes/no)
3. Questions should encourage deep reflection and self-discovery
4. Each question must come from the perspective of that domain's expert
5. Questions should relate to the user's topic and any previous conversation
6. Questions should be insightful and thought-provoking
7. If this is a follow-up, questions should build on the user's previous answers

**QUESTION STYLE:**
- Start with "What", "How", "In what way", "Describe", "Tell me about", etc.
- Avoid "Do you", "Is it", "Will you", "Can you" (these lead to yes/no answers)
- Make questions personal and relevant to the user's specific situation

**OUTPUT FORMAT:** Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {"domain": "inner_peace", "question": "Your open-ended question here"},
    {"domain": "happiness", "question": "Your open-ended question here"},
    {"domain": "family", "question": "Your open-ended question here"},
    {"domain": "friends", "question": "Your open-ended question here"},
    {"domain": "fitness", "question": "Your open-ended question here"},
    {"domain": "finance", "question": "Your open-ended question here"},
    {"domain": "business", "question": "Your open-ended question here"},
    {"domain": "education", "question": "Your open-ended question here"}
  ]
}
PROMPT;
}

/**
 * Build user prompt with conversation context
 */
function buildCouncilUserPrompt(string $initialMessage, array $conversation, string $context, string $language): string
{
    $langNote = $language === 'de'
        ? 'Bitte formuliere alle Fragen auf Deutsch.'
        : 'Please formulate all questions in English.';

    if (empty($conversation)) {
        return <<<PROMPT
The user has started a new AI Council session with the following topic:

"{$initialMessage}"

Please generate 8 thoughtful, open-ended questions - one from each domain expert's perspective - that will help the user explore this topic deeply.

{$langNote}

Remember: Each question must be OPEN-ENDED and encourage reflection, not answerable with a simple yes or no.
PROMPT;
    } else {
        $lastExchange = end($conversation);
        $lastDomain = $lastExchange['q']['domain'];
        $lastQuestion = $lastExchange['q']['q'];
        $lastAnswer = $lastExchange['a'];

        return <<<PROMPT
{$context}

The user just answered a question from the {$lastDomain} domain:
Question: "{$lastQuestion}"
Answer: "{$lastAnswer}"

Based on this new insight and the full conversation history, please generate 8 NEW thoughtful, open-ended questions - one from each domain expert's perspective.

The questions should:
1. Build upon the user's latest answer
2. Consider the full context of the conversation
3. Help the user explore new aspects related to their original topic
4. Encourage deeper self-reflection

{$langNote}

Remember: Each question must be OPEN-ENDED and encourage reflection, not answerable with a simple yes or no.
PROMPT;
    }
}

/**
 * Generate fallback questions if AI fails
 */
function generateFallbackCouncilQuestions(string $initialMessage, string $language): array
{
    $topic = $initialMessage;
    $questions = [];

    $fallbackTemplates = [
        'inner_peace' => [
            'en' => "What would finding inner peace around \"{$topic}\" look like for you?",
            'de' => "Wie würde innerer Frieden in Bezug auf \"{$topic}\" für dich aussehen?"
        ],
        'happiness' => [
            'en' => "How would achieving your goal with \"{$topic}\" contribute to your overall happiness?",
            'de' => "Wie würde das Erreichen deines Ziels bei \"{$topic}\" zu deinem Glück beitragen?"
        ],
        'family' => [
            'en' => "How might \"{$topic}\" affect your family relationships and dynamics?",
            'de' => "Wie könnte \"{$topic}\" deine Familienbeziehungen und -dynamik beeinflussen?"
        ],
        'friends' => [
            'en' => "What role do your friends play in your journey with \"{$topic}\"?",
            'de' => "Welche Rolle spielen deine Freunde bei deiner Reise mit \"{$topic}\"?"
        ],
        'fitness' => [
            'en' => "How might your physical health and fitness be connected to \"{$topic}\"?",
            'de' => "Wie könnte deine körperliche Gesundheit und Fitness mit \"{$topic}\" zusammenhängen?"
        ],
        'finance' => [
            'en' => "What are the financial implications or considerations of \"{$topic}\"?",
            'de' => "Was sind die finanziellen Auswirkungen oder Überlegungen bei \"{$topic}\"?"
        ],
        'business' => [
            'en' => "How could \"{$topic}\" impact or relate to your professional or business life?",
            'de' => "Wie könnte \"{$topic}\" dein berufliches oder geschäftliches Leben beeinflussen?"
        ],
        'education' => [
            'en' => "What would you need to learn or develop to succeed with \"{$topic}\"?",
            'de' => "Was müsstest du lernen oder entwickeln, um bei \"{$topic}\" erfolgreich zu sein?"
        ]
    ];

    foreach ($fallbackTemplates as $domain => $templates) {
        $questions[] = [
            'domain' => $domain,
            'question' => $templates[$language] ?? $templates['en']
        ];
    }

    return ['questions' => $questions];
}
