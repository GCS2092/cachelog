import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useAdminAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    const authData = localStorage.getItem('adminAuthData');
    
    if (!authData) {
      navigate('/admin');
      return;
    }

    try {
      const { timestamp } = JSON.parse(authData);
      const now = Date.now();
      
      if (now - timestamp > SESSION_TIMEOUT) {
        localStorage.removeItem('adminAuthData');
        navigate('/admin');
      }
    } catch {
      localStorage.removeItem('adminAuthData');
      navigate('/admin');
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('adminAuthData');
    navigate('/admin');
  };

  return { logout };
}
