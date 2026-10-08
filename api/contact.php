<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Production settings
|--------------------------------------------------------------------------
*/

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/*
|--------------------------------------------------------------------------
| JSON response helper
|--------------------------------------------------------------------------
*/

function respond(int $status, string $message): never
{
    http_response_code($status);

    echo json_encode(
        [
            'message' => $message,
        ],
        JSON_UNESCAPED_SLASHES |
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

/*
|--------------------------------------------------------------------------
| Input helper
|--------------------------------------------------------------------------
*/

function field(
    array $data,
    string $key,
    int $maxLength
): string {
    $value = trim(
        (string) ($data[$key] ?? '')
    );

    if (mb_strlen($value) > $maxLength) {
        return '';
    }

    return $value;
}

/*
|--------------------------------------------------------------------------
| HTML escaping
|--------------------------------------------------------------------------
*/

function e(string $value): string
{
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}

/*
|--------------------------------------------------------------------------
| Encode email header text
|--------------------------------------------------------------------------
*/

function encodeHeaderText(string $value): string
{
    return '=?UTF-8?B?' .
        base64_encode($value) .
        '?=';
}

/*
|--------------------------------------------------------------------------
| Only allow POST
|--------------------------------------------------------------------------
*/

if (
    ($_SERVER['REQUEST_METHOD'] ?? '')
    !== 'POST'
) {
    header('Allow: POST');

    respond(
        405,
        'Method not allowed'
    );
}

/*
|--------------------------------------------------------------------------
| Limit request size
|--------------------------------------------------------------------------
*/

$contentLength = (int) (
    $_SERVER['CONTENT_LENGTH'] ?? 0
);

if ($contentLength > 16384) {
    respond(
        413,
        'Request too large'
    );
}

/*
|--------------------------------------------------------------------------
| Require JSON
|--------------------------------------------------------------------------
*/

$contentType =
    $_SERVER['CONTENT_TYPE'] ?? '';

if (
    stripos(
        $contentType,
        'application/json'
    ) === false
) {
    respond(
        415,
        'Unsupported content type'
    );
}

/*
|--------------------------------------------------------------------------
| Read request
|--------------------------------------------------------------------------
*/

$rawBody =
    file_get_contents('php://input');

if (
    $rawBody === false ||
    trim($rawBody) === ''
) {
    respond(
        400,
        'Please check the form fields and try again'
    );
}

$data = json_decode(
    $rawBody,
    true
);

if (!is_array($data)) {
    respond(
        400,
        'Please check the form fields and try again'
    );
}

/*
|--------------------------------------------------------------------------
| Honeypot spam protection
|--------------------------------------------------------------------------
*/

$honeypot = trim(
    (string) ($data['_honey'] ?? '')
);

if ($honeypot !== '') {

    /*
     * Pretend success so spambots do not
     * learn that they were blocked.
     */

    respond(
        200,
        'Request received'
    );
}

/*
|--------------------------------------------------------------------------
| Validate form type
|--------------------------------------------------------------------------
*/

$formType = field(
    $data,
    'form_type',
    20
);

if (
    !in_array(
        $formType,
        [
            'lead',
            'schedule',
        ],
        true
    )
) {
    respond(
        400,
        'Please check the form fields and try again'
    );
}

/*
|--------------------------------------------------------------------------
| Common fields
|--------------------------------------------------------------------------
*/

$name = field(
    $data,
    'name',
    120
);

$email = field(
    $data,
    'email',
    254
);

$sourcePage = field(
    $data,
    'source_page',
    300
);

/*
|--------------------------------------------------------------------------
| Validate name + email
|--------------------------------------------------------------------------
*/

if (
    mb_strlen($name) < 2 ||
    preg_match('/[\r\n]/', $name) ||
    !filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    )
) {
    respond(
        400,
        'Please enter your name and a valid email'
    );
}

/*
|--------------------------------------------------------------------------
| Prevent header injection
|--------------------------------------------------------------------------
*/

if (
    preg_match('/[\r\n]/', $email)
) {
    respond(
        400,
        'Please enter a valid email'
    );
}

if ($sourcePage === '') {
    $sourcePage = '/';
}

/*
|--------------------------------------------------------------------------
| Process individual form types
|--------------------------------------------------------------------------
*/

$rows = [];

if ($formType === 'lead') {

    /*
    |--------------------------------------------------------------------------
    | Mortgage inquiry form
    |--------------------------------------------------------------------------
    */

    $phone = field(
        $data,
        'phone',
        35
    );

    $loanPurpose = field(
        $data,
        'loan_purpose',
        100
    );

    $bestTime = field(
        $data,
        'best_time',
        120
    );

    /*
    |--------------------------------------------------------------------------
    | Validate phone
    |--------------------------------------------------------------------------
    */

    $phoneDigits = preg_replace(
        '/\D+/',
        '',
        $phone
    );

    if (
        $phoneDigits === null ||
        strlen($phoneDigits) < 7 ||
        !preg_match(
            '/^[0-9+().\-\s xXeEtT]+$/',
            $phone
        )
    ) {
        respond(
            400,
            'Please enter a valid phone number'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Required mortgage fields
    |--------------------------------------------------------------------------
    */

    if (
        $loanPurpose === '' ||
        $bestTime === ''
    ) {
        respond(
            400,
            'Please choose a loan purpose and contact time'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Email subject
    |--------------------------------------------------------------------------
    */

    $subject =
        'New mortgage inquiry | GregDeskin.com';

    /*
    |--------------------------------------------------------------------------
    | Email data
    |--------------------------------------------------------------------------
    */

    $rows = [
        [
            'Full name',
            $name,
        ],
        [
            'Phone',
            $phone,
        ],
        [
            'Email',
            $email,
        ],
        [
            'Loan purpose',
            $loanPurpose,
        ],
        [
            'Best time to contact',
            $bestTime,
        ],
        [
            'Source page',
            $sourcePage,
        ],
    ];

} else {

    /*
    |--------------------------------------------------------------------------
    | Consultation scheduling form
    |--------------------------------------------------------------------------
    */

    $preferredDate = field(
        $data,
        'preferred_date',
        10
    );

    $preferredTime = field(
        $data,
        'preferred_time',
        80
    );

    $discussion = field(
        $data,
        'discussion',
        2000
    );

    /*
    |--------------------------------------------------------------------------
    | Validate preferred date
    |--------------------------------------------------------------------------
    */

    $date = DateTime::createFromFormat(
        '!Y-m-d',
        $preferredDate
    );

    if (
        !$date ||
        $date->format('Y-m-d')
            !== $preferredDate ||
        $preferredTime === ''
    ) {
        respond(
            400,
            'Please choose a valid date and time'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Email subject
    |--------------------------------------------------------------------------
    */

    $subject =
        'New consultation time request | GregDeskin.com';

    /*
    |--------------------------------------------------------------------------
    | Email data
    |--------------------------------------------------------------------------
    */

    $rows = [
        [
            'Full name',
            $name,
        ],
        [
            'Email',
            $email,
        ],
        [
            'Preferred date',
            $preferredDate,
        ],
        [
            'Preferred time',
            $preferredTime,
        ],
        [
            'Discussion',
            $discussion,
        ],
        [
            'Source page',
            $sourcePage,
        ],
    ];
}

/*
|--------------------------------------------------------------------------
| Email configuration
|--------------------------------------------------------------------------
|
| Website submissions will be delivered here.
|
*/

$recipientEmail =
    'info@gregdeskin.com';

$senderEmail =
    'info@gregdeskin.com';

$senderName =
    'Greg Deskin Website';

/*
|--------------------------------------------------------------------------
| Validate configuration
|--------------------------------------------------------------------------
*/

if (
    !filter_var(
        $recipientEmail,
        FILTER_VALIDATE_EMAIL
    ) ||
    !filter_var(
        $senderEmail,
        FILTER_VALIDATE_EMAIL
    )
) {
    error_log(
        'GregDeskin.com email configuration invalid.'
    );

    respond(
        500,
        'Contact delivery is temporarily unavailable'
    );
}

/*
|--------------------------------------------------------------------------
| Build email table
|--------------------------------------------------------------------------
*/

$tableRows = '';

foreach ($rows as [$label, $value]) {

    if ($value === '') {
        continue;
    }

    $safeValue = nl2br(
        e($value)
    );

    $tableRows .= '
        <tr>
            <th
                style="
                    padding:13px 18px;
                    text-align:left;
                    vertical-align:top;
                    border-bottom:1px solid #e4e6eb;
                    color:#616c7b;
                    width:38%;
                    font-size:13px;
                    font-weight:600;
                "
            >
                ' . e($label) . '
            </th>

            <td
                style="
                    padding:13px 18px;
                    border-bottom:1px solid #e4e6eb;
                    color:#182333;
                    font-size:15px;
                    line-height:1.5;
                    word-break:break-word;
                "
            >
                ' . $safeValue . '
            </td>
        </tr>
    ';
}

/*
|--------------------------------------------------------------------------
| Email title
|--------------------------------------------------------------------------
*/

$title =
    $formType === 'schedule'
        ? 'Consultation time request'
        : 'Mortgage inquiry';

/*
|--------------------------------------------------------------------------
| Build HTML email
|--------------------------------------------------------------------------
*/

$html = '
<!doctype html>

<html lang="en">

<head>

    <meta charset="utf-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>
        ' . e($title) . '
    </title>

</head>

<body
    style="
        margin:0;
        padding:28px 12px;
        background:#f3f5f8;
        font-family:
            Arial,
            Helvetica,
            sans-serif;
    "
>

<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
>

<tr>

<td align="center">

<table
    role="presentation"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        max-width:640px;
        width:100%;
        margin:auto;
        border-spacing:0;
        background:#ffffff;
        border:1px solid #e4e6eb;
        border-radius:8px;
        overflow:hidden;
    "
>

    <tr>

        <td
            style="
                padding:25px 28px;
                background:#161719;
                color:#ffffff;
                border-bottom:
                    4px solid #c69a31;
            "
        >

            <strong
                style="
                    font-size:23px;
                    line-height:1.3;
                "
            >
                Greg Deskin
            </strong>

            <br>

            <span
                style="
                    font-size:12px;
                    color:#e4d4a6;
                    letter-spacing:1px;
                "
            >
                MORTGAGE &amp; REAL ESTATE
            </span>

        </td>

    </tr>

    <tr>

        <td
            style="
                padding:
                    25px 28px 10px;
            "
        >

            <p
                style="
                    margin:0 0 7px;
                    color:#a67818;
                    font-size:12px;
                    font-weight:bold;
                    letter-spacing:1px;
                "
            >
                NEW WEBSITE REQUEST
            </p>

            <h1
                style="
                    margin:0;
                    color:#182333;
                    font-size:24px;
                    line-height:1.3;
                "
            >
                ' . e($title) . '
            </h1>

            <p
                style="
                    margin:10px 0 0;
                    color:#616c7b;
                    font-size:14px;
                    line-height:1.5;
                "
            >
                Reply to this email to respond directly to
                <strong>' . e($name) . '</strong>.
            </p>

        </td>

    </tr>

    <tr>

        <td
            style="
                padding:
                    10px 10px 24px;
            "
        >

            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    width:100%;
                    border-spacing:0;
                "
            >

                ' . $tableRows . '

            </table>

        </td>

    </tr>

    <tr>

        <td
            style="
                padding:14px 28px;
                border-top:
                    1px solid #e4e6eb;
                background:#fafafa;
                color:#6b7280;
                font-size:12px;
                line-height:1.5;
            "
        >

            Submitted via GregDeskin.com.

            <br>

            Please handle contact details
            confidentially.

        </td>

    </tr>

</table>

</td>

</tr>

</table>

</body>

</html>
';

/*
|--------------------------------------------------------------------------
| Prepare email headers
|--------------------------------------------------------------------------
*/

$headers = [];

/*
|--------------------------------------------------------------------------
| HTML email
|--------------------------------------------------------------------------
*/

$headers[] =
    'MIME-Version: 1.0';

$headers[] =
    'Content-Type: text/html; charset=UTF-8';

/*
|--------------------------------------------------------------------------
| From
|--------------------------------------------------------------------------
|
| Important:
| We use the website/domain email as the sender.
| Never use the visitor email in the From header.
|
*/

$headers[] =
    'From: ' .
    encodeHeaderText($senderName) .
    ' <' .
    $senderEmail .
    '>';

/*
|--------------------------------------------------------------------------
| Reply-To
|--------------------------------------------------------------------------
|
| When Greg presses Reply in Outlook,
| the reply will go to the website visitor.
|
*/

$headers[] =
    'Reply-To: ' .
    encodeHeaderText($name) .
    ' <' .
    $email .
    '>';

/*
|--------------------------------------------------------------------------
| X-Mailer
|--------------------------------------------------------------------------
*/

$headers[] =
    'X-Mailer: PHP/' .
    phpversion();

/*
|--------------------------------------------------------------------------
| Encode subject
|--------------------------------------------------------------------------
*/

$encodedSubject =
    encodeHeaderText($subject);

/*
|--------------------------------------------------------------------------
| Send using GoDaddy hosting PHP mail
|--------------------------------------------------------------------------
*/

$sent = mail(
    $recipientEmail,
    $encodedSubject,
    $html,
    implode(
        "\r\n",
        $headers
    )
);

/*
|--------------------------------------------------------------------------
| Failed
|--------------------------------------------------------------------------
*/

if (!$sent) {

    error_log(
        'GregDeskin.com contact form email failed.'
    );

    respond(
        502,
        'Contact delivery failed; please try again later'
    );
}

/*
|--------------------------------------------------------------------------
| Success
|--------------------------------------------------------------------------
*/

respond(
    200,
    'Request received'
);