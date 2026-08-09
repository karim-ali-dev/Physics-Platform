import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { ADMIN_PATH } from '../../config';

export default function ProtectedRoute({ children }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) {
    return <Navigate to={`${ADMIN_PATH}/login`} state={{ from: location.pathname }} replace />;
  }
  return children;
}
