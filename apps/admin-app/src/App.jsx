import AppRoutes from './routes/AppRoutes';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initAdmin, selectAdmin } from './features/auth/authSlice';

function App() {
  const dispatch = useDispatch();
  const admin = useSelector(selectAdmin);

  useEffect(() => {
    if (!admin) {
      dispatch(initAdmin());
    }
  }, [admin, dispatch]);

  return <AppRoutes />;
}

export default App;
