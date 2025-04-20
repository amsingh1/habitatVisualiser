'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function AuthNavBar() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  // Shared link styling
  const linkClasses = "bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75";
  const signOutClasses = "bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50";

  // Navigation links for logged-in users
  const navLinks = session && [
    // { href: "/protected/dashboard", label: "Dashboard" },
    { href: "/habitats", label: "Explore" },
    { href: "/my-images", label: "My Observations" }
  ];

  return (
    <header className="bg-indigo-600">
      <nav className="w-full px-4 sm:px-6 lg:px-8" aria-label="Top">
      <div className="w-full py-3 flex items-center justify-between border-b border-indigo-500 lg:border-none">
  {/* Logo - positioned completely left */}
  <Link href="/habitats" className="text-white text-xl font-bold">
    Habitats
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
      {loading && <span className="text-white">Loading...</span>}
      
      {!loading && !session && (
        <>
          <Link href="/auth/signin" className={linkClasses}>Login</Link>
          <Link href="/auth/signup" className={signOutClasses}>Sign up</Link>
        </>
      )}
      
      {!loading && session && (
        <>
          {/* Nav Links */}
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={`inline-block ${linkClasses}`}>
              {link.label}
            </Link>
          ))}
          
          {/* User Profile with Dropdown */}
          <div className="relative">
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              <span className="text-white">
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
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">
                    {session.user.name ? session.user.name[0] : session.user.email[0]}
                  </span>
                </div>
              )}
              
              {/* Dropdown indicator */}
              <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
          <div className="md:hidden py-2 space-y-2 border-b border-indigo-500">
            {loading && <span className="text-white px-4">Loading...</span>}
            
            {!loading && !session && (
              <div className="flex flex-col space-y-2 px-2">
                <Link href="/auth/signin" className={linkClasses}>Login</Link>
                <Link href="/auth/signup" className={signOutClasses}>Sign up</Link>
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
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center mr-2">
                      <span className="text-sm font-medium text-indigo-600">
                        {session.user.name ? session.user.name[0] : session.user.email[0]}
                      </span>
                    </div>
                  )}
                  <span className="text-white">{session.user.name || session.user.email}</span>
                </div>
                
                {/* Mobile Nav Links */}
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className={`block mx-2 ${linkClasses}`}>
                    {link.label}
                  </Link>
                ))}
                
                {/* Mobile Sign Out Button */}
                <button 
                  onClick={() => signOut({ callbackUrl: '/' })} 
                  className={`block w-full text-left mx-2 ${signOutClasses}`}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}