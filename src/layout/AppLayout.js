import { startTransition, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from '../auth/AuthContext';

gsap.registerPlugin(useGSAP);

// Add a page: one entry here plus one <Route> in App.js.
export const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/profile', label: 'Profile' },
];

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const NARROW = '(max-width: 768px)';

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef(null);
  const linksRef = useRef(null);
  const menuMounted = useRef(false);

  // Page transition: <main> is keyed by pathname, so each route animates in fresh.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(mainRef.current, {
          autoAlpha: 0,
          y: 16,
          duration: 0.35,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
        });
      });
      return () => mm.revert();
    },
    { dependencies: [pathname] }
  );

  // Mobile menu open/close. CSS owns the resting state; the tween only bridges it.
  useGSAP(
    () => {
      if (!menuMounted.current) {
        menuMounted.current = true;
        return;
      }
      const list = linksRef.current;
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${NARROW}`, () => {
        const full = { autoAlpha: 1, height: list.scrollHeight };
        const empty = { autoAlpha: 0, height: 0 };
        gsap.fromTo(list, menuOpen ? empty : full, {
          ...(menuOpen ? full : empty),
          duration: 0.25,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,height',
        });
      });
      return () => mm.revert();
    },
    { dependencies: [menuOpen] }
  );

  const closeMenu = () => setMenuOpen(false);

  // The router commits location changes in a transition. Clearing the user in the
  // same transition lets both land together, so a guarded page being left does not
  // first see a signed-out user and redirect to /login.
  const handleLogout = () => {
    navigate('/', { replace: true });
    startTransition(() => logout());
  };

  return (
    <div className="AppLayout">
      <header className="AppLayout-header">
        <nav className="AppLayout-nav" aria-label="Main">
          <button
            type="button"
            className="AppLayout-menuToggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav-links"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <ul
            id="main-nav-links"
            ref={linksRef}
            className={`AppLayout-links${menuOpen ? ' is-open' : ''}`}
          >
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={closeMenu}>
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              {user ? (
                <button type="button" className="AppLayout-logout" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <NavLink to="/login" onClick={closeMenu}>
                  Log in
                </NavLink>
              )}
            </li>
          </ul>
        </nav>
      </header>
      <main key={pathname} ref={mainRef} className="AppLayout-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
