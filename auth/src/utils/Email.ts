import nodemailer from 'nodemailer';

export class Email {
  private to: string;
  private from: string;
  constructor(email: string) {
    this.to = email;
    this.from = 'Jobizz Application <eslammegoo6@gmail.com>';
  }

  newTransport() {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'eslammegoo6@gmail.com',
        pass: 'toqh ypff gstj vnqq',
      },
    });
  }

  async send(otp: string) {
    const mailOptions = {
      from: this.from, // Sender email
      to: this.to, // Recipient email
      subject: 'Your OTP for Authentication', // Email subject
      text: `Your OTP is: ${otp}`, // Plain text body
      html: `<p>Your OTP is: <strong>${otp}</strong></p>`, // HTML body
    };

    await this.newTransport().sendMail(mailOptions);
  }
}
