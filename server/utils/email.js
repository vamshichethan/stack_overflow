import nodemailer from "nodemailer";

const RESEND_EMAIL_URL = "https://api.resend.com/emails";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const getFromAddress = () =>
  process.env.GMAIL_FROM ||
  process.env.RESEND_FROM ||
  process.env.SMTP_FROM ||
  process.env.EMAIL_FROM ||
  process.env.GMAIL_USER ||
  process.env.SMTP_USER ||
  process.env.EMAIL_USER;

const hasGmailApiConfig = () =>
  Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      (process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER)
  );

const getSmtpConfig = (context) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const smtpPort = Number(process.env.SMTP_PORT || (smtpSecure ? 465 : 587));
  const from = getFromAddress();

  if (!smtpUser || !smtpPass || !from) {
    throw new Error(`${context} email credentials are not configured.`);
  }

  if (smtpHost) {
    return {
      from,
      transport: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
      },
    };
  }

  return {
    from,
    transport: {
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 15000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
    },
  };
};

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const toBase64Body = (value = "") =>
  Buffer.from(value, "utf8").toString("base64");

const buildMimeMessage = ({ from, to, subject, text, html }) => {
  const boundary = `stack_otp_${Date.now().toString(36)}`;
  const plainText = text || html?.replace(/<[^>]*>/g, " ") || "";
  const htmlText = html || `<pre>${plainText}</pre>`;

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    toBase64Body(plainText),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    toBase64Body(htmlText),
    `--${boundary}--`,
    "",
  ].join("\r\n");
};

const getGmailAccessToken = async (context) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const responseText = await response.text();
  let payload = {};

  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = { error: responseText };
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `${context} Gmail token failed (${response.status}): ${
        payload.error_description || payload.error || responseText
      }`
    );
  }

  return payload.access_token;
};

const sendWithGmailApi = async ({ from, to, subject, text, html, context }) => {
  const accessToken = await getGmailAccessToken(context);
  const raw = toBase64Url(buildMimeMessage({ from, to, subject, text, html }));
  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let message = responseText;

    try {
      const parsed = JSON.parse(responseText);
      message = parsed.error?.message || parsed.message || responseText;
    } catch {
      // Keep the raw response text.
    }

    throw new Error(`Gmail API email failed (${response.status}): ${message}`);
  }
};

const sendWithResend = async ({ from, to, subject, text, html }) => {
  const response = await fetch(RESEND_EMAIL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let message = responseText;

    try {
      const parsed = JSON.parse(responseText);
      message = parsed.message || parsed.error || responseText;
    } catch {
      // Keep the raw response text.
    }

    throw new Error(`Resend email failed (${response.status}): ${message}`);
  }
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  text,
  html,
  context = "Transactional",
}) => {
  const from = getFromAddress();

  if (!from) {
    throw new Error(`${context} email sender is not configured.`);
  }

  if (hasGmailApiConfig()) {
    await sendWithGmailApi({
      from,
      to,
      subject,
      text,
      html,
      context,
    });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendWithResend({
      from,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  const mailConfig = getSmtpConfig(context);
  const transporter = nodemailer.createTransport(mailConfig.transport);

  await transporter.sendMail({
    from: mailConfig.from,
    to,
    subject,
    text,
    html,
  });
};
