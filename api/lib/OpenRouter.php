<?php
/**
 * api/lib/OpenRouter.php
 * OpenRouter API Integration for AI-Powered Coach Matching
 */

class OpenRouter {
    private string $apiKey;
    private string $model;
    private string $apiUrl;
    private string $siteUrl;
    private string $siteName;

    public function __construct() {
        $this->apiKey = OPENROUTER_API_KEY;
        $this->model = OPENROUTER_MODEL;
        $this->apiUrl = OPENROUTER_API_URL;
        $this->siteUrl = 'https://coachsearching.com';
        $this->siteName = 'CoachSearching';
    }

    /**
     * Check if OpenRouter is configured
     */
    public function isConfigured(): bool {
        return !empty($this->apiKey) && $this->apiKey !== 'your-openrouter-api-key';
    }

    /**
     * Send a chat completion request to OpenRouter
     */
    public function chat(array $messages, array $options = []): array {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'error' => 'OpenRouter API key not configured'
            ];
        }

        $payload = [
            'model' => $options['model'] ?? $this->model,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens' => $options['max_tokens'] ?? 2048,
        ];

        // Add response format for JSON if requested
        if (!empty($options['json_response'])) {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'HTTP-Referer: ' . $this->siteUrl,
            'X-Title: ' . $this->siteName
        ];

        $ch = curl_init($this->apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 60
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return [
                'success' => false,
                'error' => 'Network error: ' . $curlError
            ];
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            return [
                'success' => false,
                'error' => $data['error']['message'] ?? 'API request failed',
                'http_code' => $httpCode
            ];
        }

        return [
            'success' => true,
            'content' => $data['choices'][0]['message']['content'] ?? '',
            'usage' => $data['usage'] ?? null,
            'model' => $data['model'] ?? $this->model
        ];
    }

    /**
     * AI-powered coach matching based on user answers
     */
    public function matchCoaches(array $userAnswers, array $coaches, int $topN = 10): array {
        if (empty($coaches)) {
            return ['success' => false, 'error' => 'No coaches available'];
        }

        // Prepare coach summaries for the AI
        $coachSummaries = array_map(function($coach) {
            return [
                'id' => $coach['id'],
                'name' => $coach['full_name'] ?? $coach['display_name'] ?? 'Coach',
                'specialties' => $coach['specialties'] ?? [],
                'languages' => $coach['languages'] ?? [],
                'hourly_rate' => $coach['hourly_rate'] ?? 0,
                'years_experience' => $coach['years_experience'] ?? 0,
                'session_types' => $coach['session_types'] ?? [],
                'bio' => substr($coach['bio'] ?? '', 0, 500),
                'title' => $coach['title'] ?? '',
                'approach' => $coach['coaching_approach'] ?? '',
                'rating' => $coach['rating_average'] ?? 0,
                'review_count' => $coach['rating_count'] ?? 0,
                'has_video' => !empty($coach['video_intro_url']),
                'is_verified' => $coach['is_verified'] ?? false,
                'city' => $coach['city'] ?? '',
                'country' => $coach['country'] ?? ''
            ];
        }, $coaches);

        // Build the matching prompt
        $systemPrompt = $this->buildMatchingSystemPrompt();
        $userPrompt = $this->buildMatchingUserPrompt($userAnswers, $coachSummaries);

        $result = $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt]
        ], [
            'temperature' => 0.3, // Lower temperature for more consistent matching
            'max_tokens' => 4096,
            'json_response' => true
        ]);

        if (!$result['success']) {
            return $result;
        }

        // Parse the AI response
        $matchData = json_decode($result['content'], true);

        if (!$matchData || !isset($matchData['matches'])) {
            // Try to extract JSON from the response if it's wrapped in text
            preg_match('/\{[\s\S]*\}/', $result['content'], $matches);
            if (!empty($matches[0])) {
                $matchData = json_decode($matches[0], true);
            }
        }

        if (!$matchData || !isset($matchData['matches'])) {
            return [
                'success' => false,
                'error' => 'Failed to parse AI matching response'
            ];
        }

        // Merge AI scores with full coach data
        $rankedMatches = [];
        foreach ($matchData['matches'] as $match) {
            $coachId = $match['coach_id'];
            $coachData = null;

            foreach ($coaches as $coach) {
                if ($coach['id'] === $coachId) {
                    $coachData = $coach;
                    break;
                }
            }

            if ($coachData) {
                $rankedMatches[] = [
                    'coach_id' => $coachId,
                    'match_score' => min(100, max(0, $match['score'])),
                    'match_reasons' => $match['reasons'] ?? [],
                    'compatibility_summary' => $match['summary'] ?? '',
                    'coach_data' => $coachData
                ];
            }
        }

        // Sort by score and limit
        usort($rankedMatches, fn($a, $b) => $b['match_score'] <=> $a['match_score']);

        return [
            'success' => true,
            'matches' => array_slice($rankedMatches, 0, $topN),
            'ai_insights' => $matchData['overall_insights'] ?? null,
            'model_used' => $result['model']
        ];
    }

    /**
     * Build system prompt for coach matching
     */
    private function buildMatchingSystemPrompt(): string {
        return <<<PROMPT
You are an expert coaching matchmaker for CoachSearching, a European coaching marketplace. Your role is to analyze client needs and match them with the most suitable coaches.

MATCHING CRITERIA (in order of importance):
1. **Goal Alignment (35%)**: Match client's coaching goals with coach's specialties and expertise
2. **Budget Fit (20%)**: Coach's hourly rate should fit within client's budget range
3. **Communication (15%)**: Language compatibility and session type preferences (online/in-person)
4. **Experience & Credentials (15%)**: Years of experience, verification status, reviews
5. **Trust Signals (15%)**: Video intro availability, rating, review count

BUDGET RANGES:
- "under_50": €0-50/hour
- "50_100": €50-100/hour
- "100_200": €100-200/hour
- "200_plus": €200+/hour

SCORING GUIDELINES:
- 90-100: Exceptional match - strong alignment across all criteria
- 75-89: Very good match - strong alignment in key areas
- 60-74: Good match - solid alignment with some compromises
- 45-59: Fair match - partial alignment, could work
- Below 45: Weak match - significant misalignments

OUTPUT FORMAT: Return valid JSON with this structure:
{
  "matches": [
    {
      "coach_id": "uuid",
      "score": 85,
      "reasons": ["Primary reason for match", "Secondary reason", "Third reason"],
      "summary": "Brief 1-2 sentence compatibility summary"
    }
  ],
  "overall_insights": "Optional: General observations about the matches"
}

Be thoughtful and nuanced. Consider soft factors like coaching approach alignment, personality fit based on bio, and whether the coach's experience areas truly match what the client needs.
PROMPT;
    }

    /**
     * Build user prompt with client answers and coach data
     */
    private function buildMatchingUserPrompt(array $answers, array $coaches): string {
        $answersJson = json_encode($answers, JSON_PRETTY_PRINT);
        $coachesJson = json_encode($coaches, JSON_PRETTY_PRINT);

        // Map goal codes to readable goals
        $goalMap = [
            'career' => 'Career Development & Professional Growth',
            'leadership' => 'Leadership & Executive Coaching',
            'life' => 'Life Coaching & Personal Development',
            'health' => 'Health, Wellness & Fitness',
            'business' => 'Business & Entrepreneurship',
            'relationships' => 'Relationship & Communication'
        ];

        $goal = $answers['goal'] ?? 'general coaching';
        $readableGoal = $goalMap[$goal] ?? $goal;

        $experienceMap = [
            'first_time' => 'First-time coaching client',
            'few_sessions' => 'Has had a few coaching sessions before',
            'experienced' => 'Experienced with coaching'
        ];
        $experience = $experienceMap[$answers['experience'] ?? ''] ?? 'Unknown';

        $budgetMap = [
            'under_50' => 'Under €50/hour',
            '50_100' => '€50-100/hour',
            '100_200' => '€100-200/hour',
            '200_plus' => '€200+/hour'
        ];
        $budget = $budgetMap[$answers['budget'] ?? ''] ?? 'Flexible';

        $sessionType = $answers['session_type'] ?? 'online';
        $languages = is_array($answers['language'] ?? null)
            ? implode(', ', $answers['language'])
            : ($answers['language'] ?? 'English');

        $importance = is_array($answers['importance'] ?? null)
            ? implode(', ', $answers['importance'])
            : 'balanced';

        $timeline = $answers['timeline'] ?? 'flexible';
        $location = $answers['location'] ?? 'Not specified';

        return <<<PROMPT
Please match this client with the most suitable coaches:

## CLIENT PROFILE

**Primary Coaching Goal:** {$readableGoal}
**Coaching Experience:** {$experience}
**Budget Range:** {$budget}
**Preferred Session Type:** {$sessionType}
**Languages:** {$languages}
**Location:** {$location}
**Important Factors:** {$importance}
**Timeline:** {$timeline}

**Full Quiz Answers:**
{$answersJson}

## AVAILABLE COACHES

{$coachesJson}

Please analyze each coach and return the top 10 matches ranked by compatibility score. Focus on finding coaches whose expertise, approach, and offerings best align with this client's specific needs and preferences.
PROMPT;
    }

    /**
     * Generate personalized coach recommendation explanation
     */
    public function explainMatch(array $coach, array $userAnswers): array {
        $systemPrompt = <<<PROMPT
You are a helpful coaching advisor. Generate a brief, personalized explanation (2-3 sentences) of why this coach might be a good match for the client. Be specific and reference both the client's stated goals and the coach's relevant experience.
PROMPT;

        $coachInfo = json_encode([
            'name' => $coach['full_name'] ?? $coach['display_name'],
            'specialties' => $coach['specialties'] ?? [],
            'bio' => substr($coach['bio'] ?? '', 0, 300),
            'title' => $coach['title'] ?? '',
            'years_experience' => $coach['years_experience'] ?? 0
        ]);

        $answersInfo = json_encode($userAnswers);

        $userPrompt = <<<PROMPT
Client's quiz answers: {$answersInfo}

Coach profile: {$coachInfo}

Generate a personalized 2-3 sentence explanation of why this coach could be a good match.
PROMPT;

        return $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt]
        ], [
            'temperature' => 0.7,
            'max_tokens' => 256
        ]);
    }
}
