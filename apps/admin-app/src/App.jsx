import AppRoutes from './routes/AppRoutes';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { initAdmin, selectAdmin } from './features/auth/authSlice';

function App() {
  const dispatch = useDispatch();
  const admin = useSelector(selectAdmin);
  const location = useLocation();

  useEffect(() => {
    if (!admin) {
      dispatch(initAdmin());
    }
  }, [admin, dispatch]);

  useEffect(() => {
    const baseTitle = 'GramWaste Connect Admin';
    const pathname = location.pathname || '/';

    const pageTitleMap = {
      '/login': 'Login',
      '/dashboard': 'Dashboard',
      '/bins': 'Bins',
      '/tasks': 'Tasks',
      '/workers': 'Workers',
      '/issues': 'Issues',
      '/escalations': 'Escalations',
      '/hierarchy': 'Hierarchy',
      '/reports': 'Reports',
      '/announcements': 'Announcements',
      '/marketplace-moderation': 'Marketplace Moderation',
    };

    const page = pageTitleMap[pathname] || 'Admin';
    document.title = `${page} | ${baseTitle}`;
  }, [location.pathname]);

  return <AppRoutes />;
}

export default App;
