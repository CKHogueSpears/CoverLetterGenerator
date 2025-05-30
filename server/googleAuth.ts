import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("⚠️  Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return;
  }

  // Use dynamic domain detection for OAuth callback
  const currentDomain = process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
  const callbackURL = `https://${currentDomain}/auth/google/callback`;
  console.log(`🔧 OAuth callback URL configured: ${callbackURL}`);
  console.log(`🌐 Current domain: ${currentDomain}`);

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      const firstName = profile.name?.givenName;
      const lastName = profile.name?.familyName;
      const profileImageUrl = profile.photos?.[0]?.value;

      // Restrict access to specific email only
      const allowedEmail = "collin.a.spears@gmail.com";
      if (email !== allowedEmail) {
        console.log(`🚫 Access denied for email: ${email}`);
        return done(new Error(`Access restricted. Only ${allowedEmail} is authorized.`), undefined);
      }

      // Check if user already exists
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          googleId,
          email,
          firstName,
          lastName,
          profileImageUrl,
          username: email || `user_${googleId}`
        });
      } else {
        // Update existing user info
        user = await storage.updateUser(user.id, {
          email,
          firstName,
          lastName,
          profileImageUrl,
          updatedAt: new Date()
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error, undefined);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(parseInt(id));
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Auth routes with debugging
  app.get("/auth/google", (req, res, next) => {
    console.log(`🔍 OAuth attempt from: ${req.ip}`);
    console.log(`🔍 User agent: ${req.get('User-Agent')}`);
    console.log(`🔍 Callback URL configured: https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`);
    next();
  }, passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      // Successful authentication, redirect to home
      res.redirect("/");
    }
  );

  app.get("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};