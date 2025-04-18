import 'rsuite/dist/rsuite.min.css';
import './App.css'
import AppRoutes from './routes/AppRoutes';
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {

  return (
     <QueryClientProvider client={queryClient}>
    <Router>
      <AppRoutes />
    </Router>
     </QueryClientProvider>
  )
}

export default App
