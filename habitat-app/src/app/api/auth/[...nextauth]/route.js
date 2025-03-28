import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        await connectDB();

        // Find user with the email
        const user = await User.findOne({
          email: credentials.email,
        });

        // Email Not found
        if (!user) {
          throw new Error('No user found with this email');
        }

        // Check if password matches
        const isPasswordMatch = await compare(
          credentials.password,
          user.password || ''
        );

        // Incorrect password
        if (!isPasswordMatch) {
          throw new Error('Password doesn\'t match');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          id: user.id,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
      }
      return session;
    },
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        await connectDB();
        
        try {
          // Check if user already exists
          const userExists = await User.findOne({ email: profile.email });
          
          // If not, create new user
          if (!userExists) {
            await User.create({
              email: profile.email,
              name: profile.name,
              image: profile.image,
              provider: 'google',
              emailVerified: new Date(),
            });
          }
          
          return true;
        } catch (error) {
          console.log('Error checking if user exists: ', error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },

  debug: true,  // Enable debug messages
  logger: {
    error: (code, metadata) => {
      console.error(code, metadata);
    },
    warn: (code) => {
      console.warn(code);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };