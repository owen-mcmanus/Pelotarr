import { Routes, Route, Navigate } from "react-router-dom";
import Header from "../Components/Header.tsx";
import NavBar from "../Components/NavBar.tsx";

// import Calendar from "../Pages/Calendar";
import Main from "../Pages/Main";
import NotFound from "../Pages/NotFound";

function App() {

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header/>
        <div style={{ display: "flex", width: "100%"}}>
        <NavBar/>
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Main />} />
            {/*<Route path="/calendar" element={<Calendar />} />*/}
            <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
    </div>
  )
}

export default App
