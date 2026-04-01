import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import ContractsPage from './pages/ContractsPage';
import ContractDetailPage from './pages/ContractDetailPage';

function App() {
  return (
    // BrowserRouter enables client-side routing
    <BrowserRouter>
      {/* Navbar appears on every page */}
      <Navbar />

      {/* Routes defines which component renders for each URL */}
      <Routes>
        <Route path="/"                  element={<UploadPage />} />
        <Route path="/contracts"         element={<ContractsPage />} />
        <Route path="/contracts/:id"     element={<ContractDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;