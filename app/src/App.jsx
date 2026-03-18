import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SensorSetupPage from './pages/SensorSetupPage';
import SurveyPage from './pages/SurveyPage';
import SummaryPage from './pages/SummaryPage';

export default function App() {
  const [auth,    setAuth]    = useState(null);
  const [sensor,  setSensor]  = useState(null);
  const [session, setSession] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<LoginPage onLogin={setAuth} />} />
        <Route path="/sensor" element={
          auth ? <SensorSetupPage auth={auth} onSetupSensor={setSensor} /> : <Navigate to="/" />
        } />
        <Route path="/survey" element={
          auth && sensor
            ? <SurveyPage auth={auth} sensor={sensor} onSessionEnd={setSession} />
            : <Navigate to="/" />
        } />
        <Route path="/summary" element={<SummaryPage session={session} />} />
        <Route path="*"        element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
