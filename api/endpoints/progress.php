<?php
/**
 * Progress Tracking Endpoints
 * GET /progress/client/{user_id}?period={period} - Get client progress data
 * POST /progress/action-items/{id} - Update action item
 */

function handleProgress($method, $id, $action, $input) {
    if ($id === 'client' && $method === 'GET' && $action) {
        getClientProgress($action, $_GET['period'] ?? '30d');
    } elseif ($id === 'action-items' && $method === 'POST' && $action) {
        updateActionItem($action, $input);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Progress endpoint not found']);
    }
}

function getClientProgress($user_id, $period) {
    // TODO: Replace with actual Supabase query
    $data = [
        'stats' => [
            'total_sessions' => 24,
            'goals_achieved' => 3,
            'total_goals' => 5,
            'average_progress' => 68,
            'current_streak' => 12
        ],
        'sessions' => [
            [
                'id' => '1',
                'date' => '2025-11-20',
                'title' => 'Career Planning Session',
                'notes' => 'Discussed transition strategy and identified key skills',
                'mood' => 8,
                'energy' => 7,
                'progress_score' => 75,
                'coach_feedback' => 'Great progress on identifying core values'
            ],
            [
                'id' => '2',
                'date' => '2025-11-13',
                'title' => 'Goal Setting Workshop',
                'notes' => 'Set SMART goals for Q1 2026',
                'mood' => 9,
                'energy' => 8,
                'progress_score' => 70,
                'coach_feedback' => 'Excellent clarity on your goals'
            ]
        ],
        'goals' => [
            [
                'id' => '1',
                'title' => 'Career Transition',
                'category' => 'Career',
                'progress' => 75,
                'due_date' => '2026-03-31',
                'created_date' => '2025-09-01',
                'description' => 'Transition to product management role',
                'milestones' => [
                    ['id' => '1', 'title' => 'Complete PM certification', 'completed' => true],
                    ['id' => '2', 'title' => 'Build portfolio project', 'completed' => true],
                    ['id' => '3', 'title' => 'Network with 5 PMs', 'completed' => false],
                    ['id' => '4', 'title' => 'Apply to 10 positions', 'completed' => false]
                ]
            ],
            [
                'id' => '2',
                'title' => 'Work-Life Balance',
                'category' => 'Wellness',
                'progress' => 60,
                'due_date' => '2026-01-31',
                'created_date' => '2025-10-01',
                'description' => 'Establish healthy boundaries',
                'milestones' => []
            ]
        ],
        'achievements' => [
            [
                'id' => '1',
                'title' => 'First Session',
                'description' => 'Completed your first coaching session',
                'icon' => '🎯',
                'unlocked' => true,
                'unlocked_date' => '2025-09-15'
            ],
            [
                'id' => '2',
                'title' => '10 Sessions Milestone',
                'description' => 'Attended 10 coaching sessions',
                'icon' => '🔟',
                'unlocked' => true,
                'unlocked_date' => '2025-11-01'
            ],
            [
                'id' => '3',
                'title' => 'Goal Achiever',
                'description' => 'Achieved your first major goal',
                'icon' => '🏆',
                'unlocked' => true,
                'unlocked_date' => '2025-11-10'
            ],
            [
                'id' => '4',
                'title' => 'Consistent Learner',
                'description' => 'Maintain a 30-day streak',
                'icon' => '🔥',
                'unlocked' => false
            ]
        ],
        'action_items' => [
            [
                'id' => '1',
                'title' => 'Research target companies',
                'description' => 'Identify 3 companies and research their culture',
                'due_date' => '2025-11-30',
                'priority' => 'high',
                'completed' => false
            ],
            [
                'id' => '2',
                'title' => 'Update LinkedIn profile',
                'description' => 'Reflect new skills and career direction',
                'due_date' => '2025-11-25',
                'priority' => 'medium',
                'completed' => false
            ],
            [
                'id' => '3',
                'title' => 'Practice morning meditation',
                'description' => '10 minutes daily for work-life balance',
                'due_date' => '2025-11-27',
                'priority' => 'medium',
                'completed' => true
            ]
        ]
    ];
    
    echo json_encode($data);
}

function updateActionItem($id, $input) {
    // TODO: Implement actual Supabase update
    echo json_encode([
        'success' => true,
        'message' => 'Action item updated',
        'item_id' => $id
    ]);
}
