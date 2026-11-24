import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

const adminUser = {
  email: 'root@example.com',
  role: 'system_admin',
  isSystemAdmin: true,
  isGameMaster: false,
  isAdmin: true,
};

function renderSettingsRoute() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route
            path="/settings"
            element={
              <ProtectedRoute requireAdmin>
                <div>settings-content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/title" element={<div>title-content</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('AuthProvider session restore (#146)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('restores the saved session synchronously so ProtectedRoute does not redirect on first render', () => {
    localStorage.setItem('authToken', 'saved-token');
    localStorage.setItem('authUser', JSON.stringify(adminUser));

    renderSettingsRoute();

    expect(screen.getByText('settings-content')).toBeTruthy();
    expect(screen.queryByText('title-content')).toBeNull();
  });

  it('redirects to /title when there is no saved session', () => {
    renderSettingsRoute();

    expect(screen.getByText('title-content')).toBeTruthy();
    expect(screen.queryByText('settings-content')).toBeNull();
  });

  it('treats a corrupted saved session as logged out', () => {
    localStorage.setItem('authToken', 'saved-token');
    localStorage.setItem('authUser', '{invalid json');

    renderSettingsRoute();

    expect(screen.getByText('title-content')).toBeTruthy();
    expect(screen.queryByText('settings-content')).toBeNull();
  });
});
