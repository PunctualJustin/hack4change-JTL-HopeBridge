import { BrowserRouter, Routes, Route, } from 'react-router-dom';
import './App.css'
import { AuthProvider } from './contexts/AuthContext.tsx';
import ProtectedRoute from './components/protected_route.tsx';
import LoginPage from './components/login_page.tsx'
import Dashboard from './components/dashboard.tsx'
import ResourceForm from './components/resource_form.tsx';

const App = () => {
  return <BrowserRouter>  
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <LoginPage />
        } />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />} >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resource-form" element={<ResourceForm />} />
          {/* Add more protected routes here */}
        </Route>
      </Routes>
    </ AuthProvider>
  </BrowserRouter>
}

export default App