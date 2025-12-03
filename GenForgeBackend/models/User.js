import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
// Derive a 32-byte key from the secret; in production, set API_KEY_SECRET in .env
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.API_KEY_SECRET || 'genforge-default-api-key-secret')
  .digest();

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Encrypted Gemini API key for this user
  apiKeyEncrypted: {
    type: String,
    default: null
  }
}, { collection: 'Users' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Encrypt and store API key
userSchema.methods.setApiKey = function (plainApiKey) {
  if (!plainApiKey) {
    this.apiKeyEncrypted = null;
    return;
  }

  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plainApiKey, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Store iv:authTag:ciphertext (all base64) in a single field
  const payload = [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted
  ].join(':');

  this.apiKeyEncrypted = payload;
};

// Decrypt stored API key
userSchema.methods.getApiKey = function () {
  if (!this.apiKeyEncrypted) return null;

  try {
    const [ivB64, tagB64, encrypted] = this.apiKeyEncrypted.split(':');
    if (!ivB64 || !tagB64 || !encrypted) return null;

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt stored API key:', err);
    return null;
  }
};

// Method to get user without password and without raw API key
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.apiKeyEncrypted;
  return userObject;
};

const User = mongoose.model('User', userSchema);

export default User;
