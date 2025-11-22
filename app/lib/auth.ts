// Authentication utilities - now using API calls instead of localStorage

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Register a new user
export async function registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important for cookies
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Login failed' };
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

// Logout user
export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // Important for cookies
    });

    const data = await response.json();
    return { success: data.success || false };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message || 'Logout failed' };
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // Important for cookies
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return null;
    }

    return data.user || null;
  } catch (error: any) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
