<?php
/**
 * api/chemistry-call-notify.php
 * Sends email notification to coach when they receive a chemistry call request.
 */

require_once __DIR__ . '/config.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['coach_id'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$coachId = $data['coach_id'];
$clientName = $data['client_name'] ?? 'Unknown';
$clientPhone = $data['client_phone'] ?? '';
$clientEmail = $data['client_email'] ?? '';
$specialties = $data['specialties'] ?? [];
$goal = $data['goal'] ?? '';

// Fetch coach email from Supabase
$url = SUPABASE_URL . '/rest/v1/cs_coaches?select=full_name,email,user_id&user_id=eq.' . urlencode($coachId) . '&limit=1';
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . SUPABASE_ANON_KEY,
        'Content-Type: application/json',
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    error_log("Chemistry call notify: Failed to fetch coach data. HTTP $httpCode");
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Failed to fetch coach data']);
    exit;
}

$coaches = json_decode($response, true);
$coach = $coaches[0] ?? null;

if (!$coach || empty($coach['email'])) {
    error_log("Chemistry call notify: Coach not found or no email for ID: $coachId");
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Coach not found']);
    exit;
}

$coachEmail = $coach['email'];
$coachName = $coach['full_name'] ?? 'Coach';

// Build specialties string
$specialtiesStr = is_array($specialties) ? implode(', ', $specialties) : (string)$specialties;

// Build email
$subject = "New Chemistry Call Request from $clientName - CoachSearching";

$body = "Hello $coachName,\n\n";
$body .= "You have received a new chemistry call request on CoachSearching!\n\n";
$body .= "--- Client Details ---\n";
$body .= "Name: $clientName\n";
$body .= "Phone: $clientPhone\n";
$body .= "Email: $clientEmail\n";
if ($specialtiesStr) {
    $body .= "Coaching Topics: $specialtiesStr\n";
}
if ($goal) {
    $body .= "\nGoal:\n$goal\n";
}
$body .= "\n--- Action Required ---\n";
$body .= "Please reach out to $clientName at $clientPhone to schedule your chemistry call.\n\n";
$body .= "You can also view this request in your notifications:\n";
$body .= SITE_URL . "/notifications\n\n";
$body .= "Best regards,\nThe CoachSearching Team\n";

$headers = [
    'From: CoachSearching <noreply@coachsearching.com>',
    'Reply-To: noreply@coachsearching.com',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: CoachSearching/1.0',
];

$sent = @mail($coachEmail, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    error_log("Chemistry call notify: Failed to send email to $coachEmail");
}

header('Content-Type: application/json');
echo json_encode([
    'success' => $sent,
    'message' => $sent ? 'Notification sent' : 'Failed to send notification',
]);
