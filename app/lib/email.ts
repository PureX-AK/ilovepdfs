import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '', // App password for Gmail
    },
  };

  // If no SMTP credentials, return null (email won't be sent)
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('Email not configured: SMTP_USER and SMTP_PASS not set in environment variables');
    return null;
  }

  return nodemailer.createTransport(emailConfig);
};

export interface ContactEmailData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  priority: string;
}

export async function sendContactNotification(data: ContactEmailData): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn('Email transporter not available. Skipping email notification.');
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || '';
  
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not set. Skipping email notification.');
    return false;
  }

  const priorityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  };

  const priorityLabel = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  const mailOptions = {
    from: `"pagalPDF Contact Form" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: `New Contact Form Submission: ${data.subject}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #667eea; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; }
            .priority { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
            .priority-high { background: #fee; color: #c33; }
            .priority-medium { background: #ffe; color: #c93; }
            .priority-low { background: #efe; color: #3c3; }
            .message-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📧 New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${data.firstName} ${data.lastName}</div>
              </div>
              
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
              </div>
              
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${data.subject}</div>
              </div>
              
              <div class="field">
                <div class="label">Priority:</div>
                <div class="value">
                  <span class="priority priority-${data.priority}">
                    ${priorityEmoji[data.priority as keyof typeof priorityEmoji]} ${priorityLabel[data.priority as keyof typeof priorityLabel]}
                  </span>
                </div>
              </div>
              
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${data.message.replace(/\n/g, '<br>')}</div>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>This email was sent from the pagalPDF contact form.</p>
                <p>You can reply directly to this email to respond to ${data.firstName}.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
New Contact Form Submission

Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Subject: ${data.subject}
Priority: ${priorityLabel[data.priority as keyof typeof priorityLabel]}

Message:
${data.message}

---
This email was sent from the pagalPDF contact form.
    `,
    replyTo: data.email, // Allow replying directly to the user
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Contact notification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending contact notification email:', error);
    return false;
  }
}

export async function sendAutoReply(data: { email: string; firstName: string }): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }

  const mailOptions = {
    from: `"pagalPDF Support" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: 'Thank you for contacting pagalPDF',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Thank You for Contacting Us!</h2>
            </div>
            <div class="content">
              <p>Hi ${data.firstName},</p>
              
              <p>Thank you for reaching out to pagalPDF. We've received your message and our team will get back to you within 24 hours.</p>
              
              <p>In the meantime, feel free to explore our PDF tools and features.</p>
              
              <p>Best regards,<br>The pagalPDF Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.firstName},

Thank you for reaching out to pagalPDF. We've received your message and our team will get back to you within 24 hours.

In the meantime, feel free to explore our PDF tools and features.

Best regards,
The pagalPDF Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Auto-reply email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending auto-reply email:', error);
    return false;
  }
}

