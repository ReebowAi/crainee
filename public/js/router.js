// public/js/router.js - Enterprise SPA Router for Crainee
class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentPath = window.location.pathname;

    // Handle browser back/forward buttons safely
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname, false);
    });
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path, pushState = true) {
    // Clean path and strip query parameters for route matching
    const cleanPath = path.split('?')[0];
    this.currentPath = cleanPath;
    
    if (pushState && window.location.pathname !== cleanPath) {
      window.history.pushState({}, '', cleanPath);
    }
    
    this.handleRoute(cleanPath, false);
    window.scrollTo(0, 0);
  }

  handleRoute(path, pushState = true) {
    const cleanPath = path.split('?')[0];
    this.currentPath = cleanPath;

    if (pushState) {
      window.history.pushState({}, '', cleanPath);
    }

    // Check if token exists for protected routes like /dashboard
    const token = localStorage.getItem('crainee_token');
    const isProtectedRoute = cleanPath.startsWith('/dashboard');

    if (isProtectedRoute && !token) {
      // Prevent infinite redirect loops by checking current location
      if (window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
      const rootHandler = this.routes['/'] || this.routes['*'];
      if (rootHandler) rootHandler('/');
      return;
    }

    // Find matching route handler or fallback to root / index
    const routeHandler = this.routes[cleanPath] || this.routes['*'] || this.routes['/'];
    
    if (routeHandler) {
      routeHandler(cleanPath);
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }
}

// Export globally for browser environment usage
window.CraineeRouter = Router;
