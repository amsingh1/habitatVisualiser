import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const { pathname } = req.nextUrl;

  // Protected routes - redirect to login if not authenticated
  if (pathname.startsWith('/protected') && !token) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Auth routes - redirect to home if already authenticated
  if ((pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')) && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/protected/:path*', '/auth/signin', '/auth/signup'],
};