import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './utils/authContext.jsx'
import router from './router/index.jsx'

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App
