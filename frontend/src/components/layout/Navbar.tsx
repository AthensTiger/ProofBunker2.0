import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useCurrentUser } from '../../hooks/useUser';

export default function Navbar() {
  const { user, logout } = useAuth0();
  const { data: profile } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'curator';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-amber-700 text-white'
        : 'text-amber-100 hover:bg-amber-700/50 hover:text-white'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-amber-700 text-white'
        : 'text-amber-100 hover:bg-amber-700/50 hover:text-white'
    }`;

  const navLinks = [
    { to: '/bunker', label: 'My Bunker', end: true },
    { to: '/menus', label: 'Print Bunker' },
    { to: '/shared', label: 'Shared With Me' },
    { to: '/posts', label: 'Posts' },
    { to: '/messages', label: 'Messages' },
    { to: '/support', label: 'Support' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav className="bg-amber-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <NavLink to="/bunker" className="text-white text-xl font-bold tracking-tight">
              Proof Bunker
            </NavLink>
            <div className="hidden md:flex items-center ml-8 gap-1">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass} end={link.end}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Settings gear icon */}
            <NavLink
              to="/settings"
              title="Settings"
              className={({ isActive }) =>
                `p-1.5 rounded-md transition-colors ${
                  isActive
                    ? 'text-white bg-amber-700'
                    : 'text-amber-200 hover:text-white hover:bg-amber-700/50'
                }`
              }
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NavLink>
            {user?.picture && (
              <img
                src={user.picture}
                alt=""
                className="w-8 h-8 rounded-full border-2 border-amber-600"
              />
            )}
            <span className="text-amber-100 text-sm hidden sm:inline">
              {user?.name || user?.email}
            </span>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="text-amber-200 hover:text-white text-sm px-3 py-1 rounded border border-amber-600 hover:border-amber-400 transition-colors hidden sm:inline-block"
            >
              Sign Out
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden text-amber-100 hover:text-white p-1"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-amber-700 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={mobileLinkClass}
              end={link.end}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={mobileLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            Settings
          </NavLink>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="block w-full text-left px-3 py-2 text-sm font-medium text-amber-200 hover:text-white rounded-md hover:bg-amber-700/50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
