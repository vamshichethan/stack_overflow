import nodemailer from "nodemailer";

const RESEND_EMAIL_URL = "https://api.resend.com/emails";

const getFromAddress = () =>
  process.env.RESEND_FROM ||
  process.env.SMTP_FROM ||
  process.env.EMAIL_FROM ||
  process.env.SMTP_USER ||
  process.env.EMAIL_USER;

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
    },
  };
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
