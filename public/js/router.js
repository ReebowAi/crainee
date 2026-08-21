// public/js/router.js - Simple SPA router (continued)
    path = path.split('?')[0]; // Strip query params for routing
    
    this.currentPath = path;
    
    if (pushState) {
      window.history.pushState({}, '', path);
    }
    
    // Find matching route or fallback to /
    const routeHandler = this.routes[path] || this.routes['/'];
    
    if (routeHandler) {
      routeHandler(path);
    }
    
    // Scroll to top on navigation
    window.scrollTo(0, 0);
  }
  
  getCurrentPath() {
    return this.currentPath;
  }
}
