<?php
/**
 * Messaging API Endpoint
 * Handles conversations and messages between coaches and clients
 *
 * Endpoints:
 *   GET    /api/conversations                    - Get user's conversations
 *   POST   /api/conversations                    - Create new conversation
 *   GET    /api/conversations/:id                - Get conversation details
 *   GET    /api/conversations/:id/messages       - Get messages in conversation
 *   POST   /api/conversations/:id/messages       - Send message
 *   PUT    /api/conversations/:id/read           - Mark conversation as read
 */

declare(strict_types=1);

use CoachSearching\Api\Response;
use CoachSearching\Api\Auth;

/**
 * Handle messaging requests
 */
function handleMessaging(string $method, string $resource, ?string $id, ?string $action, array $input): void
{
    // All messaging endpoints require authentication
    $auth = new Auth();
    $user = $auth->requireAuth();
    $userId = $user['id'];

    $db = getSupabaseClient();

    // Determine user type (coach or client)
    $userType = getUserType($db, $userId);

    if ($resource === 'conversations') {
        handleConversations($db, $method, $userId, $userType, $id, $action, $input);
    } else {
        Response::error('Invalid messaging resource', 400, 'INVALID_RESOURCE');
    }
}

/**
 * Get user type and related IDs
 */
function getUserType($db, string $userId): array
{
    $result = [
        'type' => 'unknown',
        'coach_id' => null,
        'client_id' => null
    ];

    // Check if user is a coach
    $coach = $db->from('cs_coaches')
        ->select('id')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    if (!isset($coach['error']) && !empty($coach['data'])) {
        $result['type'] = 'coach';
        $result['coach_id'] = $coach['data']['id'];
    }

    // Check if user is a client
    $client = $db->from('cs_clients')
        ->select('id')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    if (!isset($client['error']) && !empty($client['data'])) {
        $result['client_id'] = $client['data']['id'];
        if ($result['type'] === 'unknown') {
            $result['type'] = 'client';
        }
    }

    return $result;
}

/**
 * Handle conversation endpoints
 */
function handleConversations($db, string $method, string $userId, array $userType, ?string $conversationId, ?string $action, array $input): void
{
    switch ($method) {
        case 'GET':
            if ($conversationId && $action === 'messages') {
                getMessages($db, $userId, $userType, $conversationId);
            } elseif ($conversationId) {
                getConversation($db, $userId, $userType, $conversationId);
            } else {
                getConversations($db, $userId, $userType);
            }
            break;

        case 'POST':
            if ($conversationId && $action === 'messages') {
                sendMessage($db, $userId, $userType, $conversationId, $input);
            } else {
                createConversation($db, $userId, $userType, $input);
            }
            break;

        case 'PUT':
            if ($conversationId && $action === 'read') {
                markAsRead($db, $userId, $userType, $conversationId);
            } else {
                Response::error('Invalid action', 400, 'INVALID_ACTION');
            }
            break;

        default:
            Response::error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
    }
}

/**
 * Get all conversations for user
 */
function getConversations($db, string $userId, array $userType): void
{
    try {
        $query = $db->from('cs_conversations')
            ->select('
                id,
                coach_id,
                client_id,
                subject,
                last_message_at,
                last_message_preview,
                coach_unread_count,
                client_unread_count,
                is_archived,
                created_at,
                cs_coaches (
                    id,
                    full_name,
                    avatar_url,
                    title
                ),
                cs_clients (
                    id,
                    full_name,
                    avatar_url
                )
            ')
            ->order('last_message_at', ['ascending' => false, 'nullsFirst' => false]);

        // Filter by user's role
        if ($userType['coach_id']) {
            $query = $query->eq('coach_id', $userType['coach_id']);
        } elseif ($userType['client_id']) {
            $query = $query->eq('client_id', $userType['client_id']);
        } else {
            Response::success(['conversations' => [], 'count' => 0]);
            return;
        }

        $result = $query->execute();

        if (isset($result['error'])) {
            throw new Exception($result['error']['message'] ?? 'Failed to fetch conversations');
        }

        // Add unread count for the user's perspective
        $conversations = array_map(function ($conv) use ($userType) {
            $conv['unread_count'] = $userType['type'] === 'coach'
                ? ($conv['coach_unread_count'] ?? 0)
                : ($conv['client_unread_count'] ?? 0);
            return $conv;
        }, $result['data'] ?? []);

        Response::success([
            'conversations' => $conversations,
            'count' => count($conversations)
        ]);
    } catch (Exception $e) {
        error_log("Get conversations error: " . $e->getMessage());
        Response::serverError('Failed to fetch conversations');
    }
}

/**
 * Get single conversation
 */
function getConversation($db, string $userId, array $userType, string $conversationId): void
{
    try {
        $conversation = $db->from('cs_conversations')
            ->select('
                id,
                coach_id,
                client_id,
                subject,
                last_message_at,
                coach_unread_count,
                client_unread_count,
                created_at,
                cs_coaches (
                    id,
                    full_name,
                    avatar_url,
                    title,
                    user_id
                ),
                cs_clients (
                    id,
                    full_name,
                    avatar_url,
                    user_id
                )
            ')
            ->eq('id', $conversationId)
            ->single()
            ->execute();

        if (isset($conversation['error']) || empty($conversation['data'])) {
            Response::notFound('Conversation');
            return;
        }

        $conv = $conversation['data'];

        // Verify user has access to this conversation
        $hasAccess = ($userType['coach_id'] && $conv['coach_id'] === $userType['coach_id']) ||
                     ($userType['client_id'] && $conv['client_id'] === $userType['client_id']);

        if (!$hasAccess) {
            Response::forbidden('You do not have access to this conversation');
            return;
        }

        Response::success(['conversation' => $conv]);
    } catch (Exception $e) {
        error_log("Get conversation error: " . $e->getMessage());
        Response::serverError('Failed to fetch conversation');
    }
}

/**
 * Get messages in a conversation
 */
function getMessages($db, string $userId, array $userType, string $conversationId): void
{
    try {
        // First verify access to conversation
        $conversation = $db->from('cs_conversations')
            ->select('id, coach_id, client_id')
            ->eq('id', $conversationId)
            ->single()
            ->execute();

        if (isset($conversation['error']) || empty($conversation['data'])) {
            Response::notFound('Conversation');
            return;
        }

        $conv = $conversation['data'];
        $hasAccess = ($userType['coach_id'] && $conv['coach_id'] === $userType['coach_id']) ||
                     ($userType['client_id'] && $conv['client_id'] === $userType['client_id']);

        if (!$hasAccess) {
            Response::forbidden('You do not have access to this conversation');
            return;
        }

        // Get messages
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = (int)($_GET['offset'] ?? 0);

        $messages = $db->from('cs_messages')
            ->select('
                id,
                sender_id,
                sender_type,
                content,
                is_read,
                read_at,
                created_at
            ')
            ->eq('conversation_id', $conversationId)
            ->order('created_at', ['ascending' => false])
            ->range($offset, $offset + $limit - 1)
            ->execute();

        if (isset($messages['error'])) {
            throw new Exception($messages['error']['message'] ?? 'Failed to fetch messages');
        }

        Response::success([
            'messages' => array_reverse($messages['data'] ?? []), // Reverse to show oldest first
            'conversation_id' => $conversationId,
            'limit' => $limit,
            'offset' => $offset
        ]);
    } catch (Exception $e) {
        error_log("Get messages error: " . $e->getMessage());
        Response::serverError('Failed to fetch messages');
    }
}

/**
 * Create a new conversation
 */
function createConversation($db, string $userId, array $userType, array $input): void
{
    try {
        $coachId = $input['coach_id'] ?? null;
        $subject = trim($input['subject'] ?? '');
        $initialMessage = trim($input['message'] ?? '');

        if (!$coachId) {
            Response::error('Coach ID is required', 400, 'MISSING_COACH_ID');
            return;
        }

        // If user is a coach, they can't start conversation with themselves
        if ($userType['coach_id'] === $coachId) {
            Response::error('Cannot start conversation with yourself', 400, 'INVALID_RECIPIENT');
            return;
        }

        // Ensure user has a client profile
        $clientId = $userType['client_id'];
        if (!$clientId) {
            // Create client profile if doesn't exist
            $clientResult = $db->from('cs_clients')
                ->insert([
                    'user_id' => $userId,
                    'email' => $input['email'] ?? null
                ])
                ->execute();

            if (isset($clientResult['error'])) {
                throw new Exception('Failed to create client profile');
            }
            $clientId = $clientResult['data'][0]['id'];
        }

        // Check if conversation already exists
        $existing = $db->from('cs_conversations')
            ->select('id')
            ->eq('coach_id', $coachId)
            ->eq('client_id', $clientId)
            ->single()
            ->execute();

        if (!isset($existing['error']) && !empty($existing['data'])) {
            // Return existing conversation
            Response::success([
                'message' => 'Conversation already exists',
                'conversation_id' => $existing['data']['id'],
                'is_new' => false
            ]);
            return;
        }

        // Create new conversation
        $conversation = $db->from('cs_conversations')
            ->insert([
                'coach_id' => $coachId,
                'client_id' => $clientId,
                'subject' => $subject ?: null,
                'last_message_at' => $initialMessage ? date('c') : null,
                'last_message_preview' => $initialMessage ? substr($initialMessage, 0, 100) : null,
                'coach_unread_count' => $initialMessage ? 1 : 0
            ])
            ->execute();

        if (isset($conversation['error'])) {
            throw new Exception($conversation['error']['message'] ?? 'Failed to create conversation');
        }

        $conversationId = $conversation['data'][0]['id'];

        // Send initial message if provided
        if ($initialMessage) {
            $db->from('cs_messages')
                ->insert([
                    'conversation_id' => $conversationId,
                    'sender_id' => $userId,
                    'sender_type' => 'client',
                    'content' => $initialMessage
                ])
                ->execute();
        }

        Response::created([
            'message' => 'Conversation created',
            'conversation_id' => $conversationId,
            'is_new' => true
        ]);
    } catch (Exception $e) {
        error_log("Create conversation error: " . $e->getMessage());
        Response::serverError('Failed to create conversation');
    }
}

/**
 * Send a message in a conversation
 */
function sendMessage($db, string $userId, array $userType, string $conversationId, array $input): void
{
    try {
        $content = trim($input['content'] ?? $input['message'] ?? '');

        if (empty($content)) {
            Response::error('Message content is required', 400, 'MISSING_CONTENT');
            return;
        }

        // Verify access to conversation
        $conversation = $db->from('cs_conversations')
            ->select('id, coach_id, client_id')
            ->eq('id', $conversationId)
            ->single()
            ->execute();

        if (isset($conversation['error']) || empty($conversation['data'])) {
            Response::notFound('Conversation');
            return;
        }

        $conv = $conversation['data'];
        $isCoach = $userType['coach_id'] && $conv['coach_id'] === $userType['coach_id'];
        $isClient = $userType['client_id'] && $conv['client_id'] === $userType['client_id'];

        if (!$isCoach && !$isClient) {
            Response::forbidden('You do not have access to this conversation');
            return;
        }

        $senderType = $isCoach ? 'coach' : 'client';

        // Insert message
        $message = $db->from('cs_messages')
            ->insert([
                'conversation_id' => $conversationId,
                'sender_id' => $userId,
                'sender_type' => $senderType,
                'content' => $content
            ])
            ->execute();

        if (isset($message['error'])) {
            throw new Exception($message['error']['message'] ?? 'Failed to send message');
        }

        // Note: The conversation's last_message_at and unread counts are updated
        // by a database trigger (update_conversation_on_message)

        Response::created([
            'message' => 'Message sent',
            'message_id' => $message['data'][0]['id'] ?? null,
            'conversation_id' => $conversationId
        ]);
    } catch (Exception $e) {
        error_log("Send message error: " . $e->getMessage());
        Response::serverError('Failed to send message');
    }
}

/**
 * Mark conversation as read
 */
function markAsRead($db, string $userId, array $userType, string $conversationId): void
{
    try {
        // Verify access
        $conversation = $db->from('cs_conversations')
            ->select('id, coach_id, client_id')
            ->eq('id', $conversationId)
            ->single()
            ->execute();

        if (isset($conversation['error']) || empty($conversation['data'])) {
            Response::notFound('Conversation');
            return;
        }

        $conv = $conversation['data'];
        $isCoach = $userType['coach_id'] && $conv['coach_id'] === $userType['coach_id'];
        $isClient = $userType['client_id'] && $conv['client_id'] === $userType['client_id'];

        if (!$isCoach && !$isClient) {
            Response::forbidden('You do not have access to this conversation');
            return;
        }

        // Reset unread count for user's role
        $updateField = $isCoach ? 'coach_unread_count' : 'client_unread_count';

        $db->from('cs_conversations')
            ->update([$updateField => 0, 'updated_at' => date('c')])
            ->eq('id', $conversationId)
            ->execute();

        // Mark all messages as read
        $db->from('cs_messages')
            ->update(['is_read' => true, 'read_at' => date('c')])
            ->eq('conversation_id', $conversationId)
            ->neq('sender_type', $isCoach ? 'coach' : 'client')
            ->execute();

        Response::success([
            'message' => 'Conversation marked as read',
            'conversation_id' => $conversationId
        ]);
    } catch (Exception $e) {
        error_log("Mark as read error: " . $e->getMessage());
        Response::serverError('Failed to mark as read');
    }
}
