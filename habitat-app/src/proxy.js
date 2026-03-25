import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function proxy(req) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const { pathname } = req.nextUrl;

  // Protected routes - redirect to login if not authenticated
  if ((pathname.startsWith('/protected') || 
       pathname.startsWith('/habitats/upload') || 
       pathname.startsWith('/my-images') || 
       pathname.startsWith('/habitats')) && !token) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Auth routes - redirect to home if already authenticated
  if ((pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup')) && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/protected/:path*', 
    '/habitats', 
    '/habitats/:path*',
    '/habitats/upload',
    '/my-images', 
    '/my-images/:path*',
    '/auth/signin', 
    '/auth/signup'
  ],
};