import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import resend from '../util/mailer.js';
import crypto from 'crypto';


export async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log('Log in attmpt : ', {email});
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    // console.log("user: ", user);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // const isMatch = await bcrypt.compare(password, user.password);
    const isMatch = password === user.password; // plain text compare
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Store user info in session
    req.session.userId = user._id.toString();
    req.session.role = user.role; // 'user' | 'admin'
    // Optionally store more fields if needed (but avoid sensitive data)

    res.json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Logged out successfully' });
  });
}

export async function getMe(req, res) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId).select('-password -__v');
    if (!user) {
      // Session exists but user not found (deleted etc.)
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        number: user.number,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}


export async function registerUser(req, res) {
  try {
    const { username, email, number, password, role } = req.body;

    // Basic validation
    if (!username || !number || !email || !password) {
      return res.status(400).json({ error: 'Username, email, phone and password are required' });
    }

    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, {number}],
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email/username/number already exists' });
    }

    // Hash password
    // const saltRounds = 12;
    // const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
    //   password: hashedPassword,
      number: number.trim(),
      password: password,
      role: role || 'user',
    });

    // Optionally, create session immediately (auto-login)
    req.session.userId = user._id.toString();
    req.session.role = user.role;

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        number: user.number,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}


export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    console.log(email);
    if (!user) {
      // Return 200 even if user isn't found to prevent email enumeration attacks
      return res.status(200).json({ message: 'If that email is registered, an OTP has been sent.' });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Set expiration to 10 minutes from now
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

    // Save to user document
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = otpExpires;
    await user.save();

    // Send the email
    const mailOptions = {
      from: process.env.RESEND_SENDER_EMAIL,
      to: user.email,
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is: ${otp}. It is valid for 10 minutes. Do not share this with anyone.`,
    };

    await resend.emails.send(mailOptions);

    res.status(200).json({ message: 'If that email is registered, an OTP has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    // Find user with matching email and OTP, ensuring it hasn't expired
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: { $gt: Date.now() }, // $gt means "greater than" current time
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP fields
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been successfully reset' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}