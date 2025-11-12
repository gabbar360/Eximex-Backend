import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Only configure Google OAuth if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 
          (process.env.NODE_ENV === 'production' 
            ? 'https://eximexperts.in/api/v1/auth/google/callback' 
            : 'http://localhost:8000/api/v1/auth/google/callback'),
        scope: ['profile', 'email'],
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;
        const profilePicture = profile.photos?.[0]?.value || null;

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // Update Google ID and profile picture if not set
          const updateData = {};
          if (!user.googleId) updateData.googleId = googleId;
          if (!user.profilePicture && profilePicture) updateData.profilePicture = profilePicture;
          
          if (Object.keys(updateData).length > 0) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });
          }
        } else {
          // Find ADMIN role first
          const adminRole = await prisma.role.findFirst({
            where: { name: 'ADMIN' }
          });

          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              name,
              googleId,
              profilePicture,
              isEmailVerified: true,
              roleId: adminRole?.id || null,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
    )
  );
} else {
  console.warn('⚠️  Google OAuth not configured - missing environment variables');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
