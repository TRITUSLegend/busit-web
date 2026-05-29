import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendPaymentReceipt = async (toEmail: string, name: string, amount: number, remainingCredits: number) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return;

  const date = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0a0a0b; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">BUSIT</h1>
        <p style="color: #a1a1aa; margin: 5px 0 0 0; font-size: 14px;">Digital Shuttle Wallet</p>
      </div>
      <div style="padding: 30px 20px; background-color: #ffffff; color: #18181b;">
        <h2 style="margin-top: 0;">Ride Receipt</h2>
        <p>Hi ${name},</p>
        <p>Your digital pass was just scanned for a shuttle ride.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 0 0 10px 0;"><strong>Fare Deducted:</strong> <span style="color: #ef4444; font-weight: bold;">-${amount} CR</span></p>
          <p style="margin: 0;"><strong>Remaining Balance:</strong> <span style="font-weight: bold;">${remainingCredits} CR</span></p>
        </div>

        ${remainingCredits < 40 ? '<p style="color: #ef4444; font-size: 14px; font-weight: bold;">⚠️ Your balance is running low. Please top up soon!</p>' : ''}
        
        <p style="margin-top: 30px; font-size: 14px; color: #71717a;">Thank you for riding with us!</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"BUSIT" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: 'BUSIT: Ride Fare Receipt',
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error sending payment email:', error);
  }
};

export const sendTopUpReceipt = async (toEmail: string, name: string, amount: number, newBalance: number) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return;

  const date = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0a0a0b; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">BUSIT</h1>
        <p style="color: #a1a1aa; margin: 5px 0 0 0; font-size: 14px;">Digital Shuttle Wallet</p>
      </div>
      <div style="padding: 30px 20px; background-color: #ffffff; color: #18181b;">
        <h2 style="margin-top: 0;">Wallet Top-Up</h2>
        <p>Hi ${name},</p>
        <p>Credits have been successfully added to your digital wallet.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 0 0 10px 0;"><strong>Amount Added:</strong> <span style="color: #10b981; font-weight: bold;">+${amount} CR</span></p>
          <p style="margin: 0;"><strong>New Balance:</strong> <span style="font-weight: bold;">${newBalance} CR</span></p>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #71717a;">Thank you for using BUSIT!</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"BUSIT" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: 'BUSIT: Wallet Top-Up Successful',
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error sending topup email:', error);
  }
};
