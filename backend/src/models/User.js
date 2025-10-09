const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 避免重复编译模型
let User;

// 检查User模型是否已经存在
if (mongoose.models.User) {
  User = mongoose.models.User;
} else {
  // 定义User模型
  const UserSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    balance: {
      type: Number,
      default: 100000
    },
    active: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  // 密码加密中间件
  UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

  // 验证密码方法
  UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User = mongoose.model('User', UserSchema);
}

// 添加静态comparePassword方法（如果不存在）
if (!User.comparePassword) {
  User.comparePassword = async (candidatePassword, hash) => {
    return bcrypt.compare(candidatePassword, hash);
  };
}

module.exports = User;