import jwt from 'jsonwebtoken';

export const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
    });

    const refreshToken = jwt.sign(
      { userId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('🔐 JWT Signing Error:', error); // 🔥 This will reveal the real problem
    throw new Error('Error generating tokens');
  }
};

export const setTokenCookies = (res, accessToken, refreshToken) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('accessToken', accessToken, {
    ...options,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};
