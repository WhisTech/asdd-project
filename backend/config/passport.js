const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/Users');

// Google OAuth is optional.
// The strategy is only enabled when Google credentials are provided.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log(
            'Google OAuth Profile:',
            profile.displayName,
            profile.emails[0].value
          );

          // Check if user already exists with Google ID
          let existingUser = await User.findOne({
            googleId: profile.id
          });

          if (existingUser) {
            return done(null, existingUser);
          }

          // Check if user exists with same email
          existingUser = await User.findOne({
            email: profile.emails[0].value
          });

          if (existingUser) {
            // Link Google account to existing user
            existingUser.googleId = profile.id;
            existingUser.avatar = profile.photos[0].value;

            await existingUser.save();

            return done(null, existingUser);
          }

          // Create new user from Google
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            role: 'staff',
            isActive: true,
            password: 'google-oauth-user'
          });

          const savedUser = await newUser.save();

          console.log('New Google user created:', savedUser.email);

          done(null, savedUser);
        } catch (error) {
          console.error('Google OAuth error:', error);
          done(error, null);
        }
      }
    )
  );

  console.log('✅ Google OAuth strategy enabled');
} else {
  console.log('ℹ️ Google OAuth disabled - credentials not configured');
}

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;