'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; // Import to track current path

export default function AuthNavBar() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const pathname = usePathname(); // Get current path
  
  // Shared link styling.
  // Three distinct visual roles so nothing reads as "selected" by accident:
  //   nav link  -> light text on the green bar
  //   active    -> solid white pill (unmistakably marks the current page)
  //   action    -> amber button (Upload / Sign up), never a page state
  const linkClasses = "py-2 px-3 rounded-md text-base font-medium text-emerald-50 hover:bg-white/10 hover:text-white transition-colors";
  const activeLinkClasses = "py-2 px-3 rounded-md text-base font-semibold bg-white text-emerald-900"; // Style for active link
  const signOutClasses = "bg-white/10 py-2 px-4 border border-white/25 rounded-md text-base font-medium text-white hover:bg-white/20";
  const actionButtonClasses = "py-2 px-4 border border-transparent rounded-md text-base font-semibold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition-colors";

  // Navigation links for logged-in users
  const navLinks = session && [
    // { href: "/protected/dashboard", label: "Dashboard" },
    { href: "/habitats", label: "Explore" },
    { href: "/my-images", label: "My Observations" },
    { href: "/community", label: "Community" }
  ];

  // Get the style for a nav link based on whether it's active
  const getLinkStyle = (href) => {
    if (href === '/habitats') {
      // Special case for /habitats to prevent highlighting on /habitats/upload
      const isActive = pathname === '/habitats' || 
                    (pathname.startsWith('/habitats/') && 
                      !pathname.startsWith('/habitats/upload'));
      return isActive ? activeLinkClasses : linkClasses;
    } else if (href === '/my-images') {
      // Exact match for my-images
      const isActive = pathname === '/my-images' || pathname.startsWith('/my-images/');
      return isActive ? activeLinkClasses : linkClasses;
    } else if (href === '/community') {
      // Exact match for community
      const isActive = pathname === '/community' || pathname.startsWith('/community/');
      return isActive ? activeLinkClasses : linkClasses;
    } else {
      // For other links, exact match only
      return pathname === href ? activeLinkClasses : linkClasses;
    }
  };

  return (
    <header className="bg-emerald-800">
      <nav className="w-full px-4 sm:px-6 lg:px-8" aria-label="Top">
      <div className="w-full py-3 flex items-center justify-between border-b border-white/15 lg:border-none">
  {/* Logo - positioned completely left */}
  <Link href="/" className="flex items-center gap-2 text-white text-xl font-bold">
    <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/15">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 3C10 3 3 9 3 18c0 1.5 1 2 2 2 9 0 15-7 15-17Z" />
        <path d="M8 18c3-3 6-6 11-11" />
      </svg>
    </span>
    Vegetation Types
  </Link>

  {/* Right side container for all other elements */}
  <div className="flex items-center">
    {/* Mobile Menu Button */}
    <button
      className="md:hidden text-white ml-auto"
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
    >
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
      </svg>
    </button>
    
    {/* Desktop Navigation */}
    <div className="hidden md:flex items-center space-x-4">
      {loading && <span className="text-emerald-100">Loading...</span>}

      {!loading && !session && (
        <>
          <Link href="/auth/signin" className={getLinkStyle('/auth/signin')}>Login</Link>
          <Link href="/auth/signup" className={pathname === '/auth/signup' ? activeLinkClasses : actionButtonClasses}>Sign up</Link>
        </>
      )}

      {!loading && session && (
        <>
        <Link href="/habitats/upload" className={pathname === '/habitats/upload' ? activeLinkClasses : actionButtonClasses}>
          Upload New Vegetation type
        </Link>
          {/* Nav Links */}
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={`inline-block ${getLinkStyle(link.href)}`}>
              {link.label}
            </Link>
          ))}
          
          {/* User Profile with Dropdown */}
          <div className="relative">
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              <span className="text-emerald-50">
                {session.user.name || session.user.email}
              </span>

              {session.user.image ? (
                <div className="h-8 w-8 relative">
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'Profile'}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {session.user.name ? session.user.name[0] : session.user.email[0]}
                  </span>
                </div>
              )}

              {/* Dropdown indicator */}
              <svg className="h-4 w-4 text-emerald-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <div className="px-4 py-2 text-sm text-gray-700 border-b">
                  Signed in as<br />
                  <span className="font-medium">{session.user.email}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </div>
</div>
        
        {/* Mobile Menu Dropdown - for both logged in and logged out states */}
        {mobileMenuOpen && (
          <div className="md:hidden py-2 space-y-2 border-b border-white/15">
            {loading && <span className="text-emerald-100 px-4">Loading...</span>}

            {!loading && !session && (
              <div className="flex flex-col space-y-2 px-2">
                <Link href="/auth/signin" className={getLinkStyle('/auth/signin')}>Login</Link>
                <Link href="/auth/signup" className={pathname === '/auth/signup' ? activeLinkClasses : actionButtonClasses}>Sign up</Link>
              </div>
            )}

            {!loading && session && (
              <>
                {/* Mobile User Profile */}
                <div className="flex items-center px-4 py-2">
                  {session.user.image ? (
                    <div className="h-8 w-8 relative mr-2">
                      <Image src={session.user.image} alt={session.user.name || 'Profile'} fill className="rounded-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mr-2">
                      <span className="text-sm font-medium text-white">
                        {session.user.name ? session.user.name[0] : session.user.email[0]}
                      </span>
                    </div>
                  )}
                  <span className="text-emerald-50">{session.user.name || session.user.email}</span>
                </div>

               <Link href="/habitats/upload" className={`block mx-2 ${pathname === '/habitats/upload' ? activeLinkClasses : actionButtonClasses}`}>
                Upload New Vegetation type
              </Link>
                {/* Mobile Nav Links */}
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className={`block mx-2 ${getLinkStyle(link.href)}`}>
                    {link.label}
                  </Link>
                ))}
                
                {/* Mobile Sign Out Button */}
                <Link 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    signOut({ callbackUrl: '/' });
                  }} 
                  className={`block mx-2 ${signOutClasses}`}
                >
                  Log out
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}