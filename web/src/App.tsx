import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import OpenFolderModal from './components/OpenFolderModal';
import QuickOpenModal from './components/QuickOpenModal';
import Explorer from './pages/Explorer';
import Settings from './pages/Settings';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Explorer />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      <OpenFolderModal />
      <QuickOpenModal />
    </>
  );
}
