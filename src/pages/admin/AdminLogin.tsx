import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';

const ADMIN_PASSWORD = 'admin123';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const authData = localStorage.getItem('adminAuthData');
    if (authData) {
      try {
        const { timestamp } = JSON.parse(authData);
        const now = Date.now();
        
        if (now - timestamp < SESSION_TIMEOUT) {
          navigate('/admin/dashboard');
        } else {
          localStorage.removeItem('adminAuthData');
        }
      } catch {
        localStorage.removeItem('adminAuthData');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ADMIN_PASSWORD) {
      const authData = {
        timestamp: Date.now(),
        isAuthenticated: true,
      };
      localStorage.setItem('adminAuthData', JSON.stringify(authData));
      navigate('/admin/dashboard');
    } else {
      setError('Mot de passe incorrect');
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-400 mb-2">Admin Login</h1>
          <p className="text-gray-400 text-sm sm:text-base">Connexion sécurisée avec timeout de session</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <FormInput
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Entrez votre mot de passe"
            required
            disabled={isLoading}
            error={error}
          />
          
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!password}
            fullWidth
          >
            Se connecter
          </Button>
        </form>

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
          Session expire après 30 minutes d'inactivité
        </div>
      </div>
    </div>
  );
}
