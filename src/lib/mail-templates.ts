export const getOTPEmailTemplate = (name: string, otp: string, type: 'Verification' | 'Password Reset' | 'Account Update' = 'Verification', details?: { phone?: string, email?: string }) => {
  const isRegistration = type === 'Verification';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Kravy POS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; min-height: 100vh; padding: 20px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #f3f4f6; background: linear-gradient(to right, #ecfdf5, #f0fdfa);">
                  <h1 style="margin: 0; color: #10b981; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">Kravy POS</h1>
                  <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Restaurant Management</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <!-- Welcome Header -->
                  <div style="text-align: center; margin-bottom: 35px;">
                    <div style="display: inline-block; width: 56px; height: 56px; background-color: #ecfdf5; border-radius: 50%; margin-bottom: 15px; border: 2px solid #a7f3d0; line-height: 56px;">
                      <span style="color: #10b981; font-size: 24px;">👋</span>
                    </div>
                    <h2 style="margin: 0; color: #111827; font-size: 22px; font-weight: 800;">Welcome to Kravy!</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Your account verification is pending</p>
                  </div>

                  <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: 700;">Hello ${name || 'User'},</p>
                  <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                    ${isRegistration 
                      ? 'You recently tried to create a new account on Kravy POS. To complete your registration, please enter the OTP provided below.'
                      : `You recently requested to <strong>${type.toLowerCase()}</strong> your account. Use the verification code below:`
                    }
                  </p>

                  <!-- OTP Card -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 16px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Email Verification Code</p>
                        <div style="background-color: #10b981; border-radius: 12px; padding: 18px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);">
                          <span style="color: #ffffff; font-size: 42px; font-weight: 900; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
                        </div>
                        <p style="margin: 0; color: #64748b; font-size: 12px;">🕒 This code will expire in <strong style="color: #0f172a;">10 minutes</strong></p>
                      </td>
                    </tr>
                  </table>

                  <!-- Registration Details -->
                  ${isRegistration && details ? `
                  <div style="background-color: #fafafa; border-radius: 16px; padding: 20px; margin-bottom: 25px; border: 1px solid #f4f4f5;">
                    <p style="margin: 0 0 15px 0; color: #52525b; font-size: 12px; font-weight: 800; text-transform: uppercase;">Registration details:</p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; color: #71717a; font-size: 14px;">Name</td>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #71717a; font-size: 14px;">Phone</td>
                        <td style="padding: 6px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${details.phone || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #71717a; font-size: 14px;">Email</td>
                        <td style="padding: 6px 0; color: #10b981; font-size: 14px; font-weight: 600; text-align: right;">${details.email || 'N/A'}</td>
                      </tr>
                    </table>
                  </div>
                  ` : ''}

                  <!-- Security Notice -->
                  <div style="border-left: 4px solid #ef4444; background-color: #fef2f2; padding: 20px; border-radius: 0 12px 12px 0;">
                    <p style="margin: 0 0 5px 0; color: #b91c1c; font-size: 13px; font-weight: 800;">Security Notice</p>
                    <p style="margin: 0; color: #991b1b; font-size: 12px; line-height: 1.5;">
                      If you did not request this, please ignore this email and contact us. Never share your OTP with anyone — Kravy team never asks for OTP.
                    </p>
                  </div>

                  <!-- Support Links -->
                  <div style="margin-top: 35px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                      For any help, contact: <a href="mailto:support@kravy.in" style="color: #10b981; text-decoration: none; font-weight: 700;">support@kravy.in</a> &bull; kravy.in
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 25px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
                  <p style="margin: 0; color: #9ca3af; font-size: 11px; font-weight: 600;">
                    &copy; 2026 Kravy POS &bull; Main Branch &bull; kravy.in
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const getWelcomeEmailTemplate = (name: string, details: { phone: string, email: string }) => {
  const memberSince = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Kravy POS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; min-height: 100vh; padding: 20px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #10b981, #059669);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">Kravy POS</h1>
                  <p style="margin: 5px 0 25px 0; color: #d1fae5; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Restaurant Management</p>
                  
                  <div style="display: inline-block; width: 64px; height: 64px; background-color: #ffffff; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.1); line-height: 64px; margin-bottom: 20px;">
                    <span style="color: #10b981; font-size: 32px; font-weight: bold;">✓</span>
                  </div>
                  
                  <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Account Created!</h2>
                  <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 15px;">You are now a member of Kravy POS</p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px; font-weight: 800;">Welcome aboard, ${name}! 🎉</p>
                  <p style="margin: 0 0 35px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Your Kravy POS account has been successfully created and your email is verified. You can now manage your entire business efficiently from one place.
                  </p>

                  <!-- Account Details Card -->
                  <div style="background-color: #f8fafc; border-radius: 16px; padding: 25px; margin-bottom: 35px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Your Account Details</p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Name</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${details.phone}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 700; text-align: right;">${details.email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Member since</td>
                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${memberSince}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 40px;">
                    <a href="https://billing.kravy.in" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 800; text-decoration: none; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);">Go to Dashboard</a>
                  </div>

                  <!-- Support Box -->
                  <div style="border-left: 4px solid #3b82f6; background-color: #eff6ff; padding: 20px; border-radius: 0 12px 12px 0;">
                    <p style="margin: 0 0 5px 0; color: #1d4ed8; font-size: 14px; font-weight: 800;">Need Help?</p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 13px;">
                      If you have any issues, please contact us at <a href="mailto:support@kravy.in" style="color: #2563eb; text-decoration: none; font-weight: 700;">support@kravy.in</a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                    This email was sent automatically because you created an account on Kravy POS.<br>
                    If this wasn't you, report to <a href="mailto:support@kravy.in" style="color: #ef4444; text-decoration: none; font-weight: 600;">support@kravy.in</a>
                  </p>
                  <p style="margin: 0; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    &copy; 2026 Kravy POS &bull; Main Branch &bull; kravy.in
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};
